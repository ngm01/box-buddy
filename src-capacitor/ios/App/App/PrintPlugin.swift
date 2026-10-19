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
        CAPPluginMethod(name: "print", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "printImage", returnType: CAPPluginReturnPromise)
    ]

    // Prints a PNG/JPEG (base64 or data URL) at an exact physical size in mm,
    // top-left of the printable area. Doesn't depend on WebView print CSS.
    @objc func printImage(_ call: CAPPluginCall) {
        guard let raw = call.getString("image") else {
            call.reject("Missing image")
            return
        }
        let base64 = raw.components(separatedBy: ",").last ?? raw
        guard let data = Data(base64Encoded: base64), let image = UIImage(data: data) else {
            call.reject("Invalid image data")
            return
        }
        let pointsPerMm = 72.0 / 25.4
        let size = CGSize(
            width: call.getDouble("widthMm").map { $0 * pointsPerMm } ?? image.size.width,
            height: call.getDouble("heightMm").map { $0 * pointsPerMm } ?? image.size.height
        )
        present(call, jobName: call.getString("jobName") ?? "BoxBuddy") { controller in
            controller.printPageRenderer = ImagePageRenderer(image: image, size: size)
        }
    }

    @objc func print(_ call: CAPPluginCall) {
        guard let webView = bridge?.webView else {
            call.reject("WebView unavailable")
            return
        }
        present(call, jobName: call.getString("jobName") ?? "BoxBuddy") { controller in
            controller.printFormatter = webView.viewPrintFormatter()
        }
    }

    private func present(_ call: CAPPluginCall, jobName: String, configure: @escaping (UIPrintInteractionController) -> Void) {
        DispatchQueue.main.async { [weak self] in
            guard let hostView = self?.bridge?.viewController?.view else {
                call.reject("WebView unavailable")
                return
            }

            let info = UIPrintInfo(dictionary: nil)
            info.outputType = .general
            info.jobName = jobName

            let controller = UIPrintInteractionController.shared
            controller.printInfo = info
            controller.printFormatter = nil
            controller.printPageRenderer = nil
            configure(controller)

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

// One page with the image drawn at `size` (points), clamped to the printable area.
private class ImagePageRenderer: UIPrintPageRenderer {
    let image: UIImage
    let size: CGSize

    init(image: UIImage, size: CGSize) {
        self.image = image
        self.size = size
        super.init()
    }

    override var numberOfPages: Int { 1 }

    override func drawContentForPage(at pageIndex: Int, in contentRect: CGRect) {
        let area = printableRect
        let scale = min(1, area.width / size.width, area.height / size.height)
        let rect = CGRect(x: area.minX, y: area.minY, width: size.width * scale, height: size.height * scale)
        image.draw(in: rect)
    }
}
