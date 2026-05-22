// ════════════════════════════════════════════════════════════════════════
// LocalAIPlugin.swift
// ────────────────────────────────────────────────────────────────────────
// Bridge Capacitor → MediaPipe LLM Inference (Swift side).
// Stato: STUB. Risponde, ma genera testo finto.
// Prossimo step: integrare MediaPipeTasksGenAI iOS SDK + caricare il
// modello Qwen 2.5 1.5B Instruct (.task) dal bundle dell'app o
// scaricato al primo avvio.
// ════════════════════════════════════════════════════════════════════════

import Foundation
import Capacitor

@objc(LocalAIPlugin)
public class LocalAIPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LocalAIPlugin"
    public let jsName = "LocalAI"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "echo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "generate", returnType: CAPPluginReturnPromise),
    ]

    // Quando integreremo MediaPipe:
    //   private var llm: LlmInference?
    //   override public func load() { /* load Qwen 2.5 1.5B */ }

    @objc func echo(_ call: CAPPluginCall) {
        let value = call.getString("value") ?? ""
        call.resolve([
            "value": "iOS echo: \(value)"
        ])
    }

    @objc func status(_ call: CAPPluginCall) {
        // STUB: nessun modello caricato ancora.
        call.resolve([
            "ready": false,
            "modelName": "qwen-2.5-1.5b-instruct (stub)",
            "modelSize": 0,
            "progress": 0
        ])
    }

    @objc func generate(_ call: CAPPluginCall) {
        let _ = call.getString("prompt") ?? ""
        // STUB: simula 1.5 sec di "thinking" e ritorna JSON di esempio.
        // Quando MediaPipe è integrato, qui chiameremo:
        //   try llm.generateResponse(inputText: prompt)
        DispatchQueue.global().asyncAfter(deadline: .now() + 1.5) {
            let fakeJson = """
            [
              {"type":"mission","title":"[stub] Esempio: chiudere la demo della settimana","priority":"high"},
              {"type":"routine_block","title":"[stub] Esempio: Training","startTime":"08:00","endTime":"09:00","days":[1,3,5],"description":"Forza + cardio"},
              {"type":"skill","name":"[stub] Esempio: Public Speaking","description":"Migliorare la presenza scenica"},
              {"type":"touchpoint","personName":"[stub] Esempio Giuseppe","dueDate":"2026-05-23","channel":"call","message":"Chiusura progetto demo"},
              {"type":"victory","title":"[stub] Esempio: presentazione davanti a 30 persone","story":"Prima volta su un palco vero, è andata bene."}
            ]
            """
            call.resolve([
                "text": fakeJson,
                "tokensGenerated": 142
            ])
        }
    }
}
