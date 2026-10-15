import UIKit
import Capacitor

// Prints the app's own WebView via AirPrint. window.print() is a no-op in
// WKWebView; the web side (src/services/print.service.js) hides everything
// but `.bb-print-root` under @media print before calling this.
@objc(PrintPlugin)
public class PrintPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PrintPlugin"
    public let jsName = "Print"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "print", returnType: CAPPluginReturnPromise)
    ]

    @objc func print(_ call: CAPPluginCall) {
        let jobName = call.getString("jobName") ?? "BoxBuddy"

        DispatchQueue.main.async { [weak self] in
            guard let webView = self?.bridge?.webView, let hostView = self?.bridge?.viewController?.view else {
                call.reject("WebView unavailable")
                return
            }

            let info = UIPrintInfo(dictionary: nil)
            info.outputType = .general
            info.jobName = jobName

            let controller = UIPrintInteractionController.shared
            controller.printInfo = info
            controller.printFormatter = webView.viewPrintFormatter()

            let completion: UIPrintInteractionController.CompletionHandler = { _, completed, error in
                if let error = error {
                    call.reject(error.localizedDescription)
                } else {
                    call.resolve(["completed": completed])
                }
            }

            if UIDevice.current.userInterfaceIdiom == .pad {
                let anchor = CGRect(x: hostView.bounds.midX, y: hostView.bounds.midY, width: 0, height: 0)
                controller.present(from: anchor, in: hostView, animated: true, completionHandler: completion)
            } else {
                controller.present(animated: true, completionHandler: completion)
            }
        }
    }
}
