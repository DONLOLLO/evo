// ════════════════════════════════════════════════════════════════════════
// MainViewController.swift
// ────────────────────────────────────────────────────────────────────────
// Subclass di CAPBridgeViewController che registra esplicitamente i
// plugin custom dell'app. Necessario in Capacitor 7+ per i plugin
// "inline" nel target App (non distribuiti come SPM package).
// ════════════════════════════════════════════════════════════════════════

import UIKit
import Capacitor

class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        // Registra qui ogni plugin custom dell'app.
        bridge?.registerPluginInstance(LocalAIPlugin())
    }
}
