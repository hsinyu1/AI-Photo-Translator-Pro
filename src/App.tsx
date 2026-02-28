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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing) {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

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
          <div className={`flex items-center justify-center gap-1.5 font-medium text-sm mt-1 ${!apiKey ? "text-red-500 animate-pulse" : "text-gray-600"}`}>
            {!apiKey ? (
              <>
                請先在右上角 <Settings className="w-3.5 h-3.5" /> 輸入 Gemini API Key
              </>
            ) : (
              <>
                已設定 Gemini API Key，可開始翻譯
              </>
            )}
          </div>
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
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing... ({elapsedSeconds}s)</span>
                    </div>
                    <span className="text-[10px] opacity-80 font-normal mt-0.5">平均需要 30-60 秒</span>
                  </div>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    <span>Translate Now</span>
                  </>
                )}
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

                    // 1. 初始化與環境偵測
                    const charCount = block.translatedText.length || 1;
                    const rootFontSize = 16; // 預設 16px
                    const isVertical = block.orientation === "vertical";
                    const padding = 4;
                    const targetW = Math.max(width - padding, 1);
                    const targetH = Math.max(height - padding, 1);

                    // 設定邊界
                    let minSize = 12;
                    let maxSize = isVertical ? Math.min(40, targetH) : Math.min(40, targetW);
                    let bestSize = 12;
                    const precision = 0.5;

                    // 3. 空間判斷函式 (checkFits)
                    const checkFits = (size: number, W: number, H: number, count: number) => {
                      const safeLineHeight = 1.2;
                      const effectiveSize = size * 1.05; // 預留 5% 緩衝空間

                      if (isVertical) {
                        const charsPerColumn = Math.max(Math.floor(H / effectiveSize), 1);
                        const totalColumns = Math.ceil(count / charsPerColumn);
                        const neededWidth = totalColumns * size * safeLineHeight;
                        return neededWidth <= W;
                      } else {
                        const charsPerLine = Math.max(Math.floor(W / effectiveSize), 1);
                        const totalLines = Math.ceil(count / charsPerLine);
                        const neededHeight = totalLines * size * safeLineHeight;
                        return neededHeight <= H;
                      }
                    };

                    // 2. 二分搜尋核心 (The Search Loop)
                    let low = minSize;
                    let high = maxSize;
                    while (low <= high) {
                      const mid = (low + high) / 2;
                      if (checkFits(mid, targetW, targetH, charCount)) {
                        bestSize = mid;
                        low = mid + precision;
                      } else {
                        high = mid - precision;
                      }
                    }

                    // 4. 單位轉換與輸出
                    const finalRem = bestSize / rootFontSize;
                    const shouldScroll = bestSize === 12 && !checkFits(12, targetW, targetH, charCount);

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
                          fontSize: `${finalRem}rem`,
                          lineHeight: "1.2",
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
