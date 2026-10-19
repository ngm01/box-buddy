import UIKit
import Capacitor

// Registers app-local plugins that don't come from npm packages.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(PrintPlugin())
    }
}
