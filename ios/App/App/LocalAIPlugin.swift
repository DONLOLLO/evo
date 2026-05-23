// ════════════════════════════════════════════════════════════════════════
// LocalAIPlugin.swift
// ────────────────────────────────────────────────────────────────────────
// Bridge Capacitor → MediaPipe LLM Inference. Modello: Qwen 2.5 0.5B
// Instruct Q8 (stesso engine di flutter_gemma su Sparq).
//
// Lifecycle:
//   1) load()           — invocato al boot dell'app
//   2) prepareModel()   — async: scarica da HF se assente, poi inizializza
//   3) status()         — JS può pollare per sapere lo stato
//   4) generate()       — quando ready, fa inferenza vera
//
// Stato esposto a JS:
//   - status: "idle" | "downloading" | "loading" | "ready" | "error"
//   - progress: 0.0..1.0 (durante downloading)
// ════════════════════════════════════════════════════════════════════════

import Foundation
import Capacitor
import MediaPipeTasksGenAI

@objc(LocalAIPlugin)
public class LocalAIPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LocalAIPlugin"
    public let jsName = "LocalAI"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "echo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "generate", returnType: CAPPluginReturnPromise),
    ]

    // ── Configurazione modello ─────────────────────────────────────────
    // Per swappare modello cambia solo queste tre costanti. Il file vecchio
    // resta nei Documents come orfano (rimosso da cleanupOrphanedModels()).
    private let modelURL = URL(string:
        "https://huggingface.co/litert-community/Qwen2.5-1.5B-Instruct/resolve/main/Qwen2.5-1.5B-Instruct_multi-prefill-seq_q8_ekv1280.task"
    )!
    private let modelFilename = "Qwen2.5-1.5B-Instruct_multi-prefill-seq_q8_ekv1280.task"
    private let modelName = "qwen-2.5-1.5b-instruct-q8"

    // ── Stato interno ──────────────────────────────────────────────────
    private enum ModelStatus: String {
        case idle, downloading, loading, ready, error
    }

    private let stateQueue = DispatchQueue(label: "com.nime.evo.localai.state")
    private var _status: ModelStatus = .idle
    private var _progress: Double = 0.0
    private var _errorMessage: String?
    private var llm: LlmInference?

    private var currentStatus: ModelStatus {
        stateQueue.sync { _status }
    }
    private func setStatus(_ s: ModelStatus, error: String? = nil) {
        stateQueue.sync {
            _status = s
            if let e = error { _errorMessage = e }
        }
    }
    private var currentProgress: Double {
        stateQueue.sync { _progress }
    }
    private func setProgress(_ p: Double) {
        stateQueue.sync { _progress = p }
    }
    private var currentError: String? {
        stateQueue.sync { _errorMessage }
    }

    private var modelPath: URL {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        return docs.appendingPathComponent(modelFilename)
    }

    // ── Lifecycle ──────────────────────────────────────────────────────
    public override func load() {
        Task.detached(priority: .userInitiated) { [weak self] in
            await self?.prepareModel()
        }
    }

    private func prepareModel() async {
        cleanupOrphanedModels()
        if FileManager.default.fileExists(atPath: modelPath.path) {
            await loadInference()
        } else {
            await downloadModel()
            if currentStatus != .error {
                await loadInference()
            }
        }
    }

    /// Elimina eventuali file `.task` nei Documents che non sono il modello corrente.
    /// Evita di sprecare 500MB-1GB se cambiamo modello (es. 0.5B → 1.5B).
    private func cleanupOrphanedModels() {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        guard let contents = try? FileManager.default.contentsOfDirectory(at: docs, includingPropertiesForKeys: nil) else { return }
        for url in contents {
            if url.pathExtension == "task" && url.lastPathComponent != modelFilename {
                try? FileManager.default.removeItem(at: url)
                print("[LocalAI] Pulito modello orfano: \(url.lastPathComponent)")
            }
        }
    }

    private func downloadModel() async {
        setStatus(.downloading)
        setProgress(0)

        do {
            let tempURL = try await downloadWithProgress(from: modelURL) { [weak self] progress in
                self?.setProgress(progress)
            }
            // Sposta nel Documents
            if FileManager.default.fileExists(atPath: modelPath.path) {
                try? FileManager.default.removeItem(at: modelPath)
            }
            try FileManager.default.moveItem(at: tempURL, to: modelPath)
            setProgress(1.0)
        } catch {
            setStatus(.error, error: "Download fallito: \(error.localizedDescription)")
        }
    }

    private func loadInference() async {
        setStatus(.loading)
        do {
            let options = LlmInference.Options(modelPath: modelPath.path)
            options.maxTokens = 1280
            options.maxTopk = 40
            // temperature è impostata a livello di Session (vedi generate())
            let inference = try LlmInference(options: options)
            self.llm = inference
            setStatus(.ready)
        } catch {
            setStatus(.error, error: "Caricamento modello fallito: \(error.localizedDescription)")
        }
    }

    // ── Download con progress (URLSession + delegate) ─────────────────
    private func downloadWithProgress(
        from url: URL,
        progress: @escaping (Double) -> Void
    ) async throws -> URL {
        try await withCheckedThrowingContinuation { continuation in
            let delegate = DownloadDelegate(progress: progress, completion: { result in
                continuation.resume(with: result)
            })
            let session = URLSession(configuration: .default, delegate: delegate, delegateQueue: nil)
            let task = session.downloadTask(with: url)
            task.resume()
        }
    }

    // ── API esposte a JS ──────────────────────────────────────────────
    @objc func echo(_ call: CAPPluginCall) {
        let value = call.getString("value") ?? ""
        call.resolve(["value": "iOS echo: \(value)"])
    }

    @objc func status(_ call: CAPPluginCall) {
        let s = currentStatus
        call.resolve([
            "ready": s == .ready,
            "status": s.rawValue,
            "modelName": modelName,
            "progress": currentProgress,
            "error": currentError ?? NSNull()
        ])
    }

    @objc func generate(_ call: CAPPluginCall) {
        let prompt = call.getString("prompt") ?? ""
        let temperature = Float(call.getDouble("temperature") ?? 0.3)

        guard let llm = self.llm, currentStatus == .ready else {
            call.reject("Modello non pronto (stato: \(currentStatus.rawValue))")
            return
        }
        if prompt.isEmpty {
            call.reject("Prompt vuoto")
            return
        }

        Task.detached(priority: .userInitiated) {
            do {
                // Usa Session per poter impostare temperature/topk per-call
                let sessionOptions = LlmInference.Session.Options()
                sessionOptions.temperature = temperature
                sessionOptions.topk = 40
                sessionOptions.topp = 0.95
                let session = try LlmInference.Session(llmInference: llm, options: sessionOptions)
                try session.addQueryChunk(inputText: prompt)
                let response = try session.generateResponse()
                let tokenCount = response.split(separator: " ").count
                call.resolve([
                    "text": response,
                    "tokensGenerated": tokenCount
                ])
            } catch {
                call.reject("Inferenza fallita: \(error.localizedDescription)")
            }
        }
    }
}

// ════════════════════════════════════════════════════════════════════════
// URLSessionDownloadDelegate — gestisce progress + completion.
// ════════════════════════════════════════════════════════════════════════
private class DownloadDelegate: NSObject, URLSessionDownloadDelegate {
    let progress: (Double) -> Void
    let completion: (Result<URL, Error>) -> Void
    private var didFinish = false

    init(progress: @escaping (Double) -> Void,
         completion: @escaping (Result<URL, Error>) -> Void) {
        self.progress = progress
        self.completion = completion
    }

    func urlSession(_ session: URLSession,
                    downloadTask: URLSessionDownloadTask,
                    didWriteData bytesWritten: Int64,
                    totalBytesWritten: Int64,
                    totalBytesExpectedToWrite: Int64) {
        guard totalBytesExpectedToWrite > 0 else { return }
        let p = Double(totalBytesWritten) / Double(totalBytesExpectedToWrite)
        progress(p)
    }

    func urlSession(_ session: URLSession,
                    downloadTask: URLSessionDownloadTask,
                    didFinishDownloadingTo location: URL) {
        // Sposta in una location stabile prima che iOS la cancelli
        let tempDir = FileManager.default.temporaryDirectory
        let stableURL = tempDir.appendingPathComponent(UUID().uuidString + ".task")
        do {
            try FileManager.default.moveItem(at: location, to: stableURL)
            didFinish = true
            completion(.success(stableURL))
        } catch {
            completion(.failure(error))
        }
        session.invalidateAndCancel()
    }

    func urlSession(_ session: URLSession,
                    task: URLSessionTask,
                    didCompleteWithError error: Error?) {
        if let error = error, !didFinish {
            completion(.failure(error))
            session.invalidateAndCancel()
        }
    }
}
