import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, Upload, Languages, Loader2, Image as ImageIcon, CheckCircle2, AlertCircle, RefreshCw, Settings, X, Key } from "lucide-react";
import { performOCRAndTranslate, TranslatedBlock } from "./services/visionService";

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [translatedBlocks, setTranslatedBlocks] = useState<TranslatedBlock[]>([]);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [error, setError] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  
  // API Key Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    const savedKey = localStorage.getItem("user_gemini_api_key");
    if (savedKey) setApiKey(savedKey);
  }, []);

  const saveApiKey = () => {
    localStorage.setItem("user_gemini_api_key", apiKey);
    setIsSettingsOpen(false);
    setStatus("API Key saved successfully");
    setTimeout(() => setStatus(""), 3000);
  };

  const clearApiKey = () => {
    localStorage.removeItem("user_gemini_api_key");
    setApiKey("");
    setIsSettingsOpen(false);
    setStatus("API Key cleared");
    setTimeout(() => setStatus(""), 3000);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImage(ev.target?.result as string);
        setTranslatedBlocks([]);
        setError(null);
        setStatus("Ready to translate");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
  };

  const processImage = async () => {
    if (!image) return;

    setIsProcessing(true);
    setError(null);
    setTranslatedBlocks([]);
    setProcessingTime(null);
    const startTime = Date.now();

    try {
      setStatus("Analyzing & Translating with Gemini AI...");
      const blocks = await performOCRAndTranslate(image);
      
      const endTime = Date.now();
      setProcessingTime((endTime - startTime) / 1000);

      if (blocks.length === 0) {
        setStatus("No text detected in image.");
        setIsProcessing(false);
        return;
      }

      setTranslatedBlocks(blocks);
      setStatus("Translation complete!");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred");
      setStatus("Error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate scale factor for overlays
  const [displayScale, setDisplayScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (imageRef.current && imageSize.width > 0) {
        setDisplayScale(imageRef.current.clientWidth / imageSize.width);
      }
    };

    window.addEventListener("resize", updateScale);
    updateScale();
    return () => window.removeEventListener("resize", updateScale);
  }, [image, imageSize]);

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-[#1C1C1E] font-sans p-4 md:p-8 relative">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8 text-center relative">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="absolute right-0 top-0 p-2 text-gray-400 hover:text-indigo-600 transition-colors"
            title="Settings"
          >
            <Settings className="w-6 h-6" />
          </button>
          
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-lg mb-4"
          >
            <Languages className="text-white w-8 h-8" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-3xl font-bold tracking-tight text-indigo-900"
          >
            AI Photo Translator Pro
          </motion.h1>
          <p className="text-gray-500 mt-2">Powered by Gemini AI Vision & Translation</p>
          {processingTime !== null && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-indigo-500 mt-1 font-mono"
            >
              Processing time: {processingTime.toFixed(2)}s
            </motion.p>
          )}
        </header>

        {/* Main Card */}
        <motion.div 
          layout
          className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100"
        >
          <div className="p-6 md:p-8">
            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white py-4 px-6 rounded-2xl font-semibold transition-all shadow-md active:scale-95"
              >
                <Camera className="w-5 h-5" />
                Capture or Upload
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              
              <button
                onClick={processImage}
                disabled={!image || isProcessing}
                className="flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white py-4 px-6 rounded-2xl font-semibold transition-all shadow-md active:scale-95"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
                {isProcessing ? "Processing..." : "Translate Now"}
              </button>
            </div>

            {/* Status Bar */}
            <AnimatePresence mode="wait">
              {status && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`flex items-center gap-2 mb-6 p-3 rounded-xl text-sm font-medium ${
                    error ? "bg-red-50 text-red-600" : "bg-indigo-50 text-indigo-700"
                  }`}
                >
                  {error ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  {status}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Image Preview & Overlay Area */}
            <div className="relative rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 min-h-[300px] flex items-center justify-center">
              {!image ? (
                <div className="text-center p-12">
                  <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-400 font-medium">No image selected</p>
                </div>
              ) : (
                <div ref={containerRef} className="relative w-full h-full inline-block">
                  <img
                    ref={imageRef}
                    src={image}
                    alt="Preview"
                    onLoad={handleImageLoad}
                    className="w-full h-auto block"
                  />
                  
                  {/* Text Overlays */}
                  {translatedBlocks.map((block, idx) => {
                    const vertices = block.boundingBox.vertices;
                    if (!vertices || vertices.length < 4) return null;

                    // Calculate bounding box in display coordinates (Gemini returns 0-1000 normalized)
                    const containerWidth = imageRef.current?.clientWidth || 0;
                    const containerHeight = imageRef.current?.clientHeight || 0;
                    
                    const x = Math.min(...vertices.map(v => v.x || 0)) * containerWidth / 1000;
                    const y = Math.min(...vertices.map(v => v.y || 0)) * containerHeight / 1000;
                    const width = (Math.max(...vertices.map(v => v.x || 0)) - Math.min(...vertices.map(v => v.x || 0))) * containerWidth / 1000;
                    const height = (Math.max(...vertices.map(v => v.y || 0)) - Math.min(...vertices.map(v => v.y || 0))) * containerHeight / 1000;

                    // Improved font size calculation based on box area and text length
                    const charCount = block.translatedText.length || 1;
                    const lineHeight = 1.1;
                    const padding = 4; // Total horizontal/vertical padding
                    const availableWidth = Math.max(width - padding, 1);
                    const availableHeight = Math.max(height - padding, 1);

                    const isVertical = block.orientation === "vertical";

                    // Precise check to see if text fits within the box at a given font size
                    const checkFits = (size: number) => {
                      if (isVertical) {
                        // For vertical text, height limits chars per column, width limits total columns
                        const charsPerColumn = Math.max(Math.floor(availableHeight / (size * 1.02)), 1);
                        const columnsNeeded = Math.ceil(charCount / charsPerColumn);
                        const totalWidth = columnsNeeded * size * lineHeight;
                        return totalWidth <= availableWidth * 0.95;
                      } else {
                        // For horizontal text, width limits chars per line, height limits total lines
                        const charsPerLine = Math.max(Math.floor(availableWidth / (size * 1.02)), 1);
                        const linesNeeded = Math.ceil(charCount / charsPerLine);
                        const totalHeight = linesNeeded * size * lineHeight;
                        return totalHeight <= availableHeight * 0.95;
                      }
                    };

                    // Iteratively find the best font size that fits
                    // Start from a size that definitely fits the width/height at minimum
                    let bestSize = isVertical 
                      ? Math.min(40, availableHeight, availableWidth * 0.8)
                      : Math.min(40, availableWidth, availableHeight * 0.8);
                    
                    while (bestSize > 12 && !checkFits(bestSize)) {
                      bestSize -= 0.5;
                    }
                    
                    let fontSize: number;
                    let shouldScroll: boolean;
                    
                    if (checkFits(bestSize)) {
                      fontSize = bestSize;
                      shouldScroll = false;
                    } else {
                      // If it still doesn't fit at 12px, fix at 12px and enable scroll
                      fontSize = 12;
                      shouldScroll = true;
                    }

                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className="no-scrollbar"
                        style={{
                          position: "absolute",
                          left: x,
                          top: y,
                          width: width,
                          height: height,
                          backgroundColor: "rgba(255, 255, 255, 0.98)",
                          color: "#000",
                          display: "flex",
                          flexDirection: isVertical ? "row-reverse" : "column",
                          alignItems: "center",
                          justifyContent: shouldScroll ? "flex-start" : "center",
                          padding: width < 20 || height < 20 ? "0px" : "2px",
                          borderRadius: "2px",
                          fontSize: fontSize + "px",
                          lineHeight: lineHeight.toString(),
                          textAlign: "center",
                          writingMode: isVertical ? "vertical-rl" : "horizontal-tb",
                          overflowY: !isVertical && shouldScroll ? "auto" : "hidden",
                          overflowX: isVertical && shouldScroll ? "auto" : "hidden",
                          WebkitOverflowScrolling: "touch",
                          wordBreak: "break-all",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                          zIndex: 10,
                          border: "1px solid rgba(79, 70, 229, 0.3)",
                        }}
                        title={block.text}
                      >
                        {block.translatedText}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Instructions */}
        <footer className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs">1</span>
              Upload
            </h4>
            <p className="text-sm text-gray-500">Take a photo of text in Japanese, English, or any language.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs">2</span>
              Analyze
            </h4>
            <p className="text-sm text-gray-500">Gemini AI identifies text positions and content with high precision.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs">3</span>
              Translate
            </h4>
            <p className="text-sm text-gray-500">Gemini AI translates text and overlays it perfectly on the image.</p>
          </div>
        </footer>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    API Settings
                  </h3>
                  <button 
                    onClick={() => setIsSettingsOpen(false)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Gemini API Key
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Paste your API key here..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Your key is stored locally in your browser and never sent to our servers.
                      Get a free key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">Google AI Studio</a>.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={saveApiKey}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold transition-all shadow-md active:scale-95"
                    >
                      Save Key
                    </button>
                    <button
                      onClick={clearApiKey}
                      className="px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-all"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
