import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import { GoogleGenAI, Type, Schema } from "@google/genai";

// --- Service Worker Registration ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}

// --- Types & Interfaces ---

interface NutritionItem {
  name: string;
  weight_g: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface TotalNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
}

interface AnalysisResult {
  title: string;
  summary: string;
  items: NutritionItem[];
  total: TotalNutrition;
  health_score: number;
  advice: string;
  timestamp: number;
  image?: string;
}

interface Recipe {
  name: string;
  ingredients: string[];
  instructions: string[];
  macros: { calories: number; protein: number; carbs: number; fat: number };
}

interface UserStats {
  height: string;
  weight: string;
  bmi: number | null;
}

type Language = 'sl' | 'en';
type Theme = 'light' | 'dark';
type ColorTheme = 'green' | 'blue' | 'purple' | 'orange';

// --- Constants & Translations ---

const THEME_COLORS: Record<ColorTheme, any> = {
  green: { 50: '236, 253, 245', 100: '209, 250, 229', 200: '167, 243, 208', 300: '110, 231, 183', 400: '52, 211, 153', 500: '16, 185, 129', 600: '5, 150, 105', 700: '4, 120, 87', 800: '6, 95, 70', 900: '6, 78, 59' },
  blue: { 50: '239, 246, 255', 100: '219, 234, 254', 200: '191, 219, 254', 300: '147, 197, 253', 400: '96, 165, 250', 500: '59, 130, 246', 600: '37, 99, 235', 700: '29, 78, 216', 800: '30, 64, 175', 900: '30, 58, 138' },
  purple: { 50: '250, 245, 255', 100: '243, 232, 255', 200: '233, 213, 255', 300: '216, 180, 254', 400: '192, 132, 252', 500: '168, 85, 247', 600: '147, 51, 234', 700: '126, 34, 206', 800: '107, 33, 168', 900: '88, 28, 135' },
  orange: { 50: '255, 247, 237', 100: '255, 237, 213', 200: '254, 215, 170', 300: '253, 186, 116', 400: '251, 146, 60', 500: '249, 115, 22', 600: '234, 88, 12', 700: '194, 65, 12', 800: '154, 52, 18', 900: '124, 45, 18' }
};

const TRANSLATIONS = {
  sl: {
    appTitle: "Nutri",
    close: "Zapri",
    scanBtn: "Slikaj Hrano",
    dailyIntake: "Današnji Vnos",
    history: "Zgodovina",
    noHistory: "Še ni analiziranih obrokov.",
    startNow: "Začni zdaj",
    calories: "kcal",
    protein: "Beljakovine",
    carbs: "Oglj. Hidrati",
    fat: "Maščobe",
    fiber: "Vlaknine",
    sugar: "Sladkor",
    addPhoto: "Dodaj sliko",
    takePhoto: "Slikaj",
    uploadFile: "Naloži iz galerije",
    retake: "Ponovi",
    cameraError: "Kamere ni mogoče zagnati.",
    manualEntryTitle: "Ročni vnos",
    analyzeTextBtn: "Analiziraj",
    analyzing: "Analiziram...",
    calculating: "Računam...",
    ingredients: "Sestavine",
    adviceTitle: "💡 Nasvet:",
    analyzeNew: "Analiziraj novo",
    error: "Napaka pri analizi.",
    settings: "Nastavitve",
    appearance: "Videz",
    goals: "Cilji",
    dailyCalorieGoal: "Cilj (kcal)",
    dietaryPreferences: "Preference",
    generateReport: "Poročilo",
    reportTitle: "Poročilo o Prehrani",
    printReport: "Natisni",
    date: "Datum",
    meal: "Obrok",
    total: "Skupaj",
    bmiCalculator: "ITM Kalkulator",
    height: "Višina (cm)",
    weight: "Teža (kg)",
    calculate: "Izračunaj",
    yourBmi: "Tvoj ITM",
    back: "Nazaj",
    water: "Voda",
    glasses: "koz.",
    recipes: "Recepti",
    generateRecipe: "Generiraj Recept",
    ingredientsPlaceholder: "Npr. jabolko, omleta z gobami...",
    manualPlaceholder: "Vpiši kaj si jedel (npr. 'Eno jabolko in kava z mlekom')...",
    noRecipes: "Vnesi sestavine za recept.",
    cookingInstructions: "Priprava",
    confirmDelete: "Izbrišem zgodovino?",
    clearHistory: "Počisti vse"
  },
  en: {
    appTitle: "Nutri",
    close: "Close",
    scanBtn: "Scan Food",
    dailyIntake: "Daily Intake",
    history: "History",
    noHistory: "No meals yet.",
    startNow: "Start now",
    calories: "kcal",
    protein: "Protein",
    carbs: "Carbs",
    fat: "Fat",
    fiber: "Fiber",
    sugar: "Sugar",
    addPhoto: "Add Photo",
    takePhoto: "Capture",
    uploadFile: "Upload",
    retake: "Retake",
    cameraError: "Camera error.",
    manualEntryTitle: "Manual Entry",
    analyzeTextBtn: "Analyze",
    analyzing: "Analyzing...",
    calculating: "Thinking...",
    ingredients: "Ingredients",
    adviceTitle: "💡 Advice:",
    analyzeNew: "Analyze New",
    error: "Analysis failed.",
    settings: "Settings",
    appearance: "Appearance",
    goals: "Goals",
    dailyCalorieGoal: "Goal (kcal)",
    dietaryPreferences: "Preferences",
    generateReport: "Report",
    reportTitle: "Nutrition Report",
    printReport: "Print",
    date: "Date",
    meal: "Meal",
    total: "Total",
    bmiCalculator: "BMI Calculator",
    height: "Height (cm)",
    weight: "Weight (kg)",
    calculate: "Calculate",
    yourBmi: "Your BMI",
    back: "Back",
    water: "Water",
    glasses: "glasses",
    recipes: "Recipes",
    generateRecipe: "Generate Recipe",
    ingredientsPlaceholder: "E.g. apple, mushroom omelette...",
    manualPlaceholder: "Type what you ate (e.g. 'One apple and latte')...",
    noRecipes: "Enter ingredients for a recipe.",
    cookingInstructions: "Instructions",
    confirmDelete: "Clear history?",
    clearHistory: "Clear All"
  }
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    summary: { type: Type.STRING },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          weight_g: { type: Type.NUMBER },
          calories: { type: Type.NUMBER },
          protein: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fat: { type: Type.NUMBER },
        },
        required: ["name", "weight_g", "calories", "protein", "carbs", "fat"]
      }
    },
    total: {
      type: Type.OBJECT,
      properties: {
        calories: { type: Type.NUMBER },
        protein: { type: Type.NUMBER },
        carbs: { type: Type.NUMBER },
        fat: { type: Type.NUMBER },
        fiber: { type: Type.NUMBER },
        sugar: { type: Type.NUMBER },
      },
      required: ["calories", "protein", "carbs", "fat", "fiber", "sugar"]
    },
    health_score: { type: Type.NUMBER },
    advice: { type: Type.STRING }
  },
  required: ["title", "summary", "items", "total", "health_score", "advice"]
};

const recipeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
    instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
    macros: {
      type: Type.OBJECT,
      properties: {
        calories: { type: Type.NUMBER },
        protein: { type: Type.NUMBER },
        carbs: { type: Type.NUMBER },
        fat: { type: Type.NUMBER }
      }
    }
  },
  required: ["name", "ingredients", "instructions", "macros"]
};

// --- Helper Components ---

const MacroRing = ({ label, value, color, target = 100, unit = "g" }: any) => {
  const percentage = Math.min(100, (value / target) * 100);
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="relative w-12 h-12 mb-1">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="24" cy="24" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-100 dark:text-gray-700" />
          <circle cx="24" cy="24" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={`transition-all duration-1000 ${color}`} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-black">{Math.round(value)}</span>
        </div>
      </div>
      <span className="text-[9px] font-bold text-gray-400 uppercase">{label}</span>
    </div>
  );
};

const LoadingOverlay = ({ t }: { t: any }) => (
  <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/90 dark:bg-gray-900/90 backdrop-blur-md">
    <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
    <h3 className="text-xl font-black">{t.analyzing}</h3>
  </div>
);

const ReportDocument = ({ history, t }: any) => {
  return (
    <div id="report-content" className="bg-white text-black p-10 max-w-4xl mx-auto shadow-2xl print:shadow-none">
      <div className="mb-8 border-b-2 border-primary-500 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black">{t.reportTitle}</h1>
          <p className="text-gray-500">{new Date().toLocaleDateString()}</p>
        </div>
      </div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b">
            <th className="py-2">{t.date}</th>
            <th className="py-2">{t.meal}</th>
            <th className="py-2 text-right">{t.calories}</th>
          </tr>
        </thead>
        <tbody>
          {history.map((item: any, idx: number) => (
            <tr key={idx} className="border-b">
              <td className="py-2 text-sm text-gray-500">{new Date(item.timestamp).toLocaleDateString()}</td>
              <td className="py-2 font-bold">{item.title}</td>
              <td className="py-2 text-right font-bold">{Math.round(item.total.calories)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ReportView = ({ history, onClose, t }: any) => (
  <div className="fixed inset-0 z-50 bg-gray-100 dark:bg-gray-900 overflow-y-auto">
    <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 p-4 flex justify-between items-center print:hidden border-b">
      <button onClick={onClose} className="font-bold">← {t.back}</button>
      <button onClick={() => window.print()} className="bg-primary-600 text-white px-6 py-2 rounded-xl font-bold">{t.printReport}</button>
    </div>
    <div className="p-4"><ReportDocument history={history} t={t} /></div>
  </div>
);

// --- Main App Component ---

const App = () => {
  const [view, setView] = useState<'HOME' | 'SCAN' | 'RESULT' | 'SETTINGS' | 'REPORT' | 'RECIPES'>('HOME');
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null);
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [manualInput, setManualInput] = useState(""); // Ločeno stanje za ročni vnos
  const [waterCount, setWaterCount] = useState(0);
  const [recipeIngredients, setRecipeIngredients] = useState("");
  
  const [lang, setLang] = useState<Language>('sl');
  const [theme, setTheme] = useState<Theme>('light');
  const [colorTheme, setColorTheme] = useState<ColorTheme>('green');
  const [dailyGoal, setDailyGoal] = useState<number>(2000);
  const [dietaryPref, setDietaryPref] = useState<string>("");
  const [userStats, setUserStats] = useState<UserStats>({ height: "", weight: "", bmi: null });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    const colors = THEME_COLORS[colorTheme];
    Object.keys(colors).forEach(shade => {
      document.documentElement.style.setProperty(`--color-primary-${shade}`, colors[shade]);
    });
  }, [theme, colorTheme]);

  const handleAnalyze = async (desc: string, image: string | null) => {
    if (!desc.trim() && !image) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const parts: any[] = [];
      if (image) parts.push({ inlineData: { data: image.split(',')[1], mimeType: "image/jpeg" } });
      parts.push({ text: `Analyze food. Output JSON. Lang: ${lang}. Prefs: ${dietaryPref}. Desc: ${desc}` });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts },
        config: { responseMimeType: "application/json", responseSchema: analysisSchema }
      });
      const data = JSON.parse(response.text!);
      const result = { ...data, timestamp: Date.now(), image: image || undefined };
      setHistory(prev => [result, ...prev]);
      setCurrentAnalysis(result);
      setView('RESULT');
      setManualInput(""); // Počisti vnos
    } catch (e) { setError(t.error); } finally { setIsAnalyzing(false); }
  };

  const handleGenerateRecipe = async () => {
    if (!recipeIngredients.trim()) return;
    setIsAnalyzing(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Create a healthy recipe using: ${recipeIngredients}. Lang: ${lang}. Target remaining calories for user.`,
        config: { responseMimeType: "application/json", responseSchema: recipeSchema }
      });
      setCurrentRecipe(JSON.parse(response.text!));
    } catch (e) { setError(t.error); } finally { setIsAnalyzing(false); }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) { setError(t.cameraError); }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx?.drawImage(videoRef.current, 0, 0);
      setInputImage(canvasRef.current.toDataURL('image/jpeg'));
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      setIsCameraActive(false);
    }
  };

  const todayHistory = history.filter(h => new Date(h.timestamp).toDateString() === new Date().toDateString());
  const todayCals = todayHistory.reduce((s, h) => s + h.total.calories, 0);
  const progress = Math.min(100, (todayCals / dailyGoal) * 100);

  if (view === 'REPORT') return <ReportView history={history} onClose={() => setView('SETTINGS')} t={t} />;

  return (
    <div className="min-h-screen text-gray-900 dark:text-gray-100 font-sans pb-24">
      <nav className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b p-4 flex justify-between items-center transition-colors">
        <h1 className="font-black text-2xl text-primary-600 cursor-pointer" onClick={() => setView('HOME')}>{t.appTitle}</h1>
        <div className="flex gap-2 items-center">
          <button 
            onClick={() => setLang(l => l === 'sl' ? 'en' : 'sl')} 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] font-bold uppercase transition-colors"
          >
            {lang}
          </button>
          <button 
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-lg transition-colors"
          >
            {theme === 'light' ? "🌙" : "☀️"}
          </button>
          <button 
            onClick={() => setView(v => v === 'SETTINGS' ? 'HOME' : 'SETTINGS')} 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 transition-colors"
          >
            ⚙️
          </button>
        </div>
      </nav>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {view === 'HOME' && (
          <>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] shadow-xl border border-primary-100">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t.dailyIntake}</h2>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black">{Math.round(todayCals)}</span>
                    <span className="text-sm text-gray-400">/ {dailyGoal} kcal</span>
                  </div>
                </div>
                <div className="text-primary-600 font-black">{Math.round(progress)}%</div>
              </div>
              <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-primary-600 transition-all duration-1000" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-6">
                <MacroRing label={t.protein} value={todayHistory.reduce((s, h) => s + h.total.protein, 0)} color="text-blue-500" target={150} />
                <MacroRing label={t.carbs} value={todayHistory.reduce((s, h) => s + h.total.carbs, 0)} color="text-orange-500" target={250} />
                <MacroRing label={t.fat} value={todayHistory.reduce((s, h) => s + h.total.fat, 0)} color="text-yellow-500" target={70} />
                <MacroRing label={t.fiber} value={todayHistory.reduce((s, h) => s + h.total.fiber, 0)} color="text-green-500" target={30} />
              </div>
            </div>

            {/* Water Tracker */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-[2rem] flex items-center justify-between">
              <div>
                <h3 className="font-black text-blue-600">{t.water}</h3>
                <p className="text-sm text-blue-400">{waterCount} {t.glasses} ({(waterCount * 0.25).toFixed(1)}L)</p>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => setWaterCount(Math.max(0, waterCount - 1))} className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow-md font-bold">-</button>
                <div className="relative w-8 h-12 border-2 border-blue-400 rounded-md overflow-hidden bg-white/50">
                   <div className="absolute bottom-0 w-full bg-blue-400 transition-all duration-500" style={{ height: `${Math.min(100, (waterCount / 8) * 100)}%` }}></div>
                </div>
                <button onClick={() => setWaterCount(waterCount + 1)} className="w-10 h-10 rounded-full bg-blue-600 text-white shadow-lg font-bold">+</button>
              </div>
            </div>

            {/* Ročni vnos hrane */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700">
               <h3 className="font-black mb-3 text-sm uppercase tracking-wider text-gray-400">{t.manualEntryTitle}</h3>
               <textarea 
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder={t.manualPlaceholder}
                  className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border-none focus:ring-2 focus:ring-primary-500 transition-all min-h-[80px] text-sm resize-none"
               />
               <div className="mt-3 flex justify-end">
                  <button 
                    disabled={!manualInput.trim() || isAnalyzing}
                    onClick={() => handleAnalyze(manualInput, null)}
                    className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-bold text-sm shadow-md disabled:opacity-50 active:scale-95 transition-transform"
                  >
                    {t.analyzeTextBtn}
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <button onClick={() => setView('SCAN')} className="p-6 bg-primary-600 text-white rounded-3xl font-black text-lg shadow-lg active:scale-95 transition-transform">📸 {t.scanBtn}</button>
               <button onClick={() => setView('RECIPES')} className="p-6 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-3xl font-black text-lg shadow-lg active:scale-95 transition-transform">🥗 {t.recipes}</button>
            </div>

            <div className="space-y-4">
               <h3 className="font-bold text-lg">{t.history}</h3>
               {history.length === 0 ? <p className="text-center text-gray-400 py-10">{t.noHistory}</p> : history.slice(0, 5).map((h, i) => (
                 <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-2xl flex items-center gap-4 shadow-sm active:scale-[0.98] transition-transform cursor-pointer" onClick={() => { setCurrentAnalysis(h); setView('RESULT'); }}>
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl overflow-hidden">
                        {h.image ? <img src={h.image} className="w-full h-full object-cover" /> : "🍽️"}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold truncate max-w-[180px]">{h.title}</div>
                      <div className="text-xs text-gray-500">{Math.round(h.total.calories)} kcal • Score: {h.health_score}</div>
                    </div>
                 </div>
               ))}
            </div>
          </>
        )}

        {view === 'RECIPES' && (
          <div className="space-y-6">
            <button onClick={() => setView('HOME')} className="font-bold">← {t.back}</button>
            <h2 className="text-2xl font-black">{t.recipes}</h2>
            <textarea value={recipeIngredients} onChange={(e) => setRecipeIngredients(e.target.value)} placeholder={t.ingredientsPlaceholder} className="w-full p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 min-h-[100px]" />
            <button onClick={handleGenerateRecipe} className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black">{t.generateRecipe}</button>
            
            {currentRecipe && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl space-y-4">
                <h3 className="text-xl font-black">{currentRecipe.name}</h3>
                <div className="grid grid-cols-4 gap-2 text-[10px] font-bold text-center">
                   <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">{currentRecipe.macros.calories} kcal</div>
                   <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">{currentRecipe.macros.protein}g P</div>
                   <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg">{currentRecipe.macros.carbs}g C</div>
                   <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-lg">{currentRecipe.macros.fat}g F</div>
                </div>
                <div className="space-y-2">
                   <h4 className="font-bold">{t.ingredients}</h4>
                   <ul className="list-disc list-inside text-sm">{currentRecipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}</ul>
                </div>
                <div className="space-y-2">
                   <h4 className="font-bold">{t.cookingInstructions}</h4>
                   <ol className="list-decimal list-inside text-sm space-y-1">{currentRecipe.instructions.map((ins, i) => <li key={i}>{ins}</li>)}</ol>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'SCAN' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black">{t.addPhoto}</h2>
            <div className="aspect-square bg-black rounded-3xl overflow-hidden relative shadow-2xl">
              {inputImage ? <img src={inputImage} className="w-full h-full object-cover" /> : (
                <>
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <canvas ref={canvasRef} className="hidden" />
                  {!isCameraActive && <button onClick={startCamera} className="absolute inset-0 m-auto w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-4xl">📸</button>}
                  {isCameraActive && <button onClick={capturePhoto} className="absolute bottom-8 left-1/2 -translate-x-1/2 w-20 h-20 border-4 border-white rounded-full flex items-center justify-center"><div className="w-16 h-16 bg-white rounded-full"></div></button>}
                </>
              )}
            </div>
            {inputImage && <button onClick={() => setInputImage(null)} className="w-full py-2 font-bold text-primary-600">{t.retake}</button>}
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.ingredientsPlaceholder} className="w-full p-4 rounded-2xl bg-gray-100 dark:bg-gray-800" />
            <button onClick={() => handleAnalyze(description, inputImage)} className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black">{t.analyzeTextBtn}</button>
          </div>
        )}

        {view === 'RESULT' && currentAnalysis && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm">
               {currentAnalysis.image && <img src={currentAnalysis.image} className="w-full h-48 object-cover" />}
               <div className="p-6 space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-black">{currentAnalysis.title}</h2>
                    <div className="text-2xl font-black text-primary-600">{currentAnalysis.health_score}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center"><div className="font-black">{Math.round(currentAnalysis.total.protein)}g</div><div className="text-[10px] uppercase">{t.protein}</div></div>
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-center"><div className="font-black">{Math.round(currentAnalysis.total.carbs)}g</div><div className="text-[10px] uppercase">{t.carbs}</div></div>
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl text-center"><div className="font-black">{Math.round(currentAnalysis.total.fat)}g</div><div className="text-[10px] uppercase">{t.fat}</div></div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold">{t.ingredients}</h3>
                    {currentAnalysis.items.map((it, i) => <div key={i} className="flex justify-between text-sm border-b pb-1"><span>{it.name}</span><span>{it.calories} kcal</span></div>)}
                  </div>
                  <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-xl text-sm leading-relaxed"><strong>{t.adviceTitle}</strong> {currentAnalysis.advice}</div>
               </div>
            </div>
            <button onClick={() => setView('HOME')} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black">{t.analyzeNew}</button>
          </div>
        )}

        {view === 'SETTINGS' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black">{t.settings}</h2>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl space-y-4">
              <div className="flex justify-between items-center"><label>{t.appearance}</label><span className="text-sm font-bold text-gray-400 uppercase">{theme}</span></div>
              <div className="flex gap-2">{(['green', 'blue', 'purple', 'orange'] as ColorTheme[]).map(c => <button key={c} onClick={() => setColorTheme(c)} className={`w-8 h-8 rounded-full ${colorTheme === c ? 'ring-2 ring-black dark:ring-white' : ''}`} style={{ backgroundColor: THEME_COLORS[c][500] }} />)}</div>
              <div><label className="block text-sm font-bold mb-1">{t.dailyCalorieGoal}</label><input type="number" value={dailyGoal} onChange={(e) => setDailyGoal(Number(e.target.value))} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-700" /></div>
              <div><label className="block text-sm font-bold mb-1">{t.dietaryPreferences}</label><input type="text" value={dietaryPref} onChange={(e) => setDietaryPref(e.target.value)} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-700" /></div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl space-y-4">
               <h3 className="font-bold">{t.bmiCalculator}</h3>
               <div className="flex gap-2"><input placeholder={t.height} value={userStats.height} onChange={(e) => setUserStats(s => ({...s, height: e.target.value}))} className="w-1/2 p-3 rounded-xl bg-gray-50 dark:bg-gray-700" /><input placeholder={t.weight} value={userStats.weight} onChange={(e) => setUserStats(s => ({...s, weight: e.target.value}))} className="w-1/2 p-3 rounded-xl bg-gray-50 dark:bg-gray-700" /></div>
               <button onClick={() => { const h = Number(userStats.height)/100; setUserStats(s => ({...s, bmi: Number(s.weight) / (h*h)})); }} className="w-full py-2 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold">{t.calculate}</button>
               {userStats.bmi && <div className="text-center font-black text-xl">{t.yourBmi}: {userStats.bmi.toFixed(1)}</div>}
            </div>
            <button onClick={() => setView('REPORT')} className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black">{t.generateReport}</button>
            <button onClick={() => window.confirm(t.confirmDelete) && setHistory([])} className="w-full py-4 text-red-500 font-bold">{t.clearHistory}</button>
          </div>
        )}
      </main>

      {isAnalyzing && createPortal(<LoadingOverlay t={t} />, document.body)}
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);