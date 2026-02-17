import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import Card from './Card';
import Button from './Button';

interface BarcodeScannerProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        // Initialize scanner
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true,
            supportedScanTypes: [0], // Only camera
            formatsToSupport: [
                Html5QrcodeSupportedFormats.QR_CODE,
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.CODE_128
            ]
        };

        scannerRef.current = new Html5QrcodeScanner(
            "reader",
            config,
      /* verbose= */ false
        );

        scannerRef.current.render(
            (decodedText) => {
                // Stop scanner on success
                if (scannerRef.current) {
                    scannerRef.current.clear();
                }
                onScan(decodedText);
            },
            (error) => {
                // Silently ignore errors (most are just frame failures)
            }
        );

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
            }
        };
    }, [onScan]);

    return (
        <div className="fixed inset-0 bg-brand-dark/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-2xl overflow-hidden !border-primary/30" padding="none">
                <div className="p-4 bg-brand-dark flex justify-between items-center border-b border-primary/20">
                    <h3 className="text-primary font-bold uppercase tracking-widest text-xs">Escanear Produto</h3>
                    <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="relative rounded-2xl overflow-hidden border-2 border-primary/20 bg-black aspect-square">
                        <div id="reader" className="w-full h-full"></div>

                        {/* Custom Overlay */}
                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                            <div className="w-64 h-64 border-2 border-primary/50 rounded-3xl relative">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-primary/30 animate-scan"></div>
                                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary"></div>
                                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary"></div>
                                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary"></div>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary"></div>
                            </div>
                            <p className="mt-8 text-[11px] font-bold text-white uppercase tracking-widest opacity-60">
                                Posicione o código no centro
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-[10px] text-gray-400 text-center uppercase font-bold px-4">
                            Certifique-se de que há boa iluminação para uma leitura rápida.
                        </p>
                        <Button variant="secondary" fullWidth onClick={onClose}>
                            Cancelar Leitura
                        </Button>
                    </div>
                </div>
            </Card>

            <style>{`
        #reader { border: none !important; }
        #reader button { 
          background: #d1ae77 !important; 
          color: #1a1a1a !important; 
          border: none !important;
          padding: 8px 16px !important;
          border-radius: 8px !important;
          font-size: 12px !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          margin-top: 10px !important;
          cursor: pointer !important;
        }
        #reader video { border-radius: 12px !important; }
        #reader__dashboard_section_csr button { display: inline-block !important; }
        
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
        .animate-scan {
          animation: scan 2s infinite ease-in-out;
        }
      `}</style>
        </div>
    );
};

export default BarcodeScanner;
