import React, { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI, Type, Schema } from "@google/genai";

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
  health_score: number; // 0-100
  advice: string;
  timestamp: number;
  image?: string;
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
  green: {
    50: '236, 253, 245',
    100: '209, 250, 229',
    200: '167, 243, 208',
    300: '110, 231, 183',
    400: '52, 211, 153',
    500: '16, 185, 129',
    600: '5, 150, 105',
    700: '4, 120, 87',
    800: '6, 95, 70',
    900: '6, 78, 59',
  },
  blue: {
    50: '239, 246, 255',
    100: '219, 234, 254',
    200: '191, 219, 254',
    300: '147, 197, 253',
    400: '96, 165, 250',
    500: '59, 130, 246',
    600: '37, 99, 235',
    700: '29, 78, 216',
    800: '30, 64, 175',
    900: '30, 58, 138',
  },
  purple: {
    50: '250, 245, 255',
    100: '243, 232, 255',
    200: '233, 213, 255',
    300: '216, 180, 254',
    400: '192, 132, 252',
    500: '168, 85, 247',
    600: '147, 51, 234',
    700: '126, 34, 206',
    800: '107, 33, 168',
    900: '88, 28, 135',
  },
  orange: {
    50: '255, 247, 237',
    100: '255, 237, 213',
    200: '254, 215, 170',
    300: '253, 186, 116',
    400: '251, 146, 60',
    500: '249, 115, 22',
    600: '234, 88, 12',
    700: '194, 65, 12',
    800: '154, 52, 18',
    900: '124, 45, 18',
  }
};

const QUOTES = {
  sl: [
    "Tvoje telo je tvoj tempelj.",
    "Jej mavrico, počuti se sijajno.",
    "Hrana je gorivo za življenje.",
    "Majhni koraki, velike spremembe.",
    "Zdravje je največje bogastvo.",
    "Danes izberi zdravo.",
    "Vsak obrok šteje.",
    "Hrani svoje telo z ljubeznijo."
  ],
  en: [
    "Your body is your temple.",
    "Eat the rainbow, feel the glow.",
    "Food is fuel for life.",
    "Small steps, big changes.",
    "Health is the greatest wealth.",
    "Choose healthy today.",
    "Every meal counts.",
    "Nourish to flourish."
  ]
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
    takePhoto: "Slikaj ali naloži iz galerije",
    manualEntryTitle: "Ročni vnos hrane",
    whatDidYouEat: "Kaj si jedel?",
    analyzeTextBtn: "Analiziraj vnos",
    imageNotes: "Opombe k sliki (neobvezno)",
    imageNotesPlaceholder: "Npr. 'Brez majoneze', 'Polovična porcija'...",
    analyzing: "Analiziram hrano...",
    cancel: "Prekliči",
    calculate: "Izračunaj",
    calculating: "Računam...",
    energy: "Energija",
    macroRatio: "Makro Razmerje",
    ingredients: "Sestavine",
    nutritionFacts: "Hranilna Vrednost",
    servingSize: "Velikost porcije",
    oneMeal: "1 Obrok",
    totalFat: "Maščobe skupaj",
    totalCarbs: "Ogljikovi hidrati",
    dietaryFiber: "Prehranske vlaknine",
    totalSugars: "Sladkorji",
    proteinLabel: "Beljakovine",
    adviceTitle: "💡 Nasvet nutricionista:",
    analyzeNew: "Analiziraj nov obrok",
    error: "Analiza ni uspela. Poskusite znova.",
    emptyResponse: "Prazan odgovor",
    manualPlaceholder: "Vpiši hrano (npr. 'Eno jabolko in kava z mlekom')...",
    settings: "Nastavitve",
    appearance: "Videz",
    language: "Jezik",
    data: "Podatki",
    clearHistory: "Počisti vso zgodovino",
    delete: "Izbriši",
    themeLight: "Svetla",
    themeDark: "Temna",
    back: "Nazaj",
    confirmDelete: "Ali res želiš izbrisati?",
    colorTheme: "Barvna Tema",
    goals: "Cilji & Preference",
    dailyCalorieGoal: "Dnevni cilj (kcal)",
    dietaryPreferences: "Prehranske preference",
    dietaryPlaceholder: "npr. Vegan, Brez glutena, Keto...",
    generateReport: "Ustvari Poročilo",
    reportTitle: "Poročilo o Prehrani",
    printReport: "Natisni / Shrani kot PDF",
    date: "Datum",
    meal: "Obrok",
    total: "Skupaj",
    tools: "Orodja",
    bmiCalculator: "ITM Kalkulator",
    height: "Višina (cm)",
    weight: "Teža (kg)",
    yourBmi: "Vaš ITM",
    underweight: "Podhranjenost",
    normal: "Normalna teža",
    overweight: "Prekomerna teža",
    obese: "Debelost"
  },
  en: {
    appTitle: "Nutri",
    close: "Close",
    scanBtn: "Scan Food",
    dailyIntake: "Daily Intake",
    history: "History",
    noHistory: "No meals analyzed yet.",
    startNow: "Start now",
    calories: "kcal",
    protein: "Protein",
    carbs: "Carbs",
    fat: "Fat",
    fiber: "Fiber",
    sugar: "Sugar",
    addPhoto: "Add Photo",
    takePhoto: "Take a picture or upload",
    manualEntryTitle: "Manual Entry",
    whatDidYouEat: "What did you eat?",
    analyzeTextBtn: "Analyze Entry",
    imageNotes: "Image Notes (Optional)",
    imageNotesPlaceholder: "E.g. 'No mayo', 'Half portion'...",
    analyzing: "Analyzing food...",
    cancel: "Cancel",
    calculate: "Calculate",
    calculating: "Thinking...",
    energy: "Energy",
    macroRatio: "Macro Ratio",
    ingredients: "Ingredients",
    nutritionFacts: "Nutrition Facts",
    servingSize: "Serving Size",
    oneMeal: "1 Meal",
    totalFat: "Total Fat",
    totalCarbs: "Total Carbohydrate",
    dietaryFiber: "Dietary Fiber",
    totalSugars: "Total Sugars",
    proteinLabel: "Protein",
    adviceTitle: "💡 Nutritionist Advice:",
    analyzeNew: "Analyze New Meal",
    error: "Analysis failed. Please try again.",
    emptyResponse: "Empty response",
    manualPlaceholder: "Enter food (e.g. 'One apple and coffee with milk')...",
    settings: "Settings",
    appearance: "Appearance",
    language: "Language",
    data: "Data",
    clearHistory: "Clear All History",
    delete: "Delete",
    themeLight: "Light",
    themeDark: "Dark",
    back: "Back",
    confirmDelete: "Are you sure?",
    colorTheme: "Color Theme",
    goals: "Goals & Preferences",
    dailyCalorieGoal: "Daily Goal (kcal)",
    dietaryPreferences: "Dietary Preferences",
    dietaryPlaceholder: "e.g. Vegan, Gluten-free, Keto...",
    generateReport: "Generate Report",
    reportTitle: "Nutrition Report",
    printReport: "Print / Save as PDF",
    date: "Date",
    meal: "Meal",
    total: "Total",
    tools: "Tools",
    bmiCalculator: "BMI Calculator",
    height: "Height (cm)",
    weight: "Weight (kg)",
    yourBmi: "Your BMI",
    underweight: "Underweight",
    normal: "Normal weight",
    overweight: "Overweight",
    obese: "Obesity"
  }
};

// --- API Configuration ---

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Short title of the meal" },
    summary: { type: Type.STRING, description: "Short summary of content" },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Name of the food item" },
          weight_g: { type: Type.NUMBER, description: "Estimated weight in grams" },
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
    health_score: { type: Type.NUMBER, description: "Health score from 0 to 100" },
    advice: { type: Type.STRING, description: "Brief advice to improve the meal" }
  },
  required: ["title", "summary", "items", "total", "health_score", "advice"]
};

// --- Components ---

const ReportView: React.FC<{
  history: AnalysisResult[];
  onClose: () => void;
  t: any;
  colorTheme: ColorTheme;
}> = ({ history, onClose, t, colorTheme }) => {
  const totalCalories = history.reduce((acc, curr) => acc + curr.total.calories, 0);
  const totalProtein = history.reduce((acc, curr) => acc + curr.total.protein, 0);
  const totalCarbs = history.reduce((acc, curr) => acc + curr.total.carbs, 0);
  const totalFat = history.reduce((acc, curr) => acc + curr.total.fat, 0);

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-950 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white">{t.reportTitle}</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-5 rounded-2xl bg-primary-50 dark:bg-primary-900/20">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.calories}</div>
            <div className="text-2xl font-black text-primary-600 dark:text-primary-400">{Math.round(totalCalories)}</div>
          </div>
          <div className="p-5 rounded-2xl bg-blue-50 dark:bg-blue-900/20">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.protein}</div>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{Math.round(totalProtein)}g</div>
          </div>
          <div className="p-5 rounded-2xl bg-orange-50 dark:bg-orange-900/20">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.carbs}</div>
            <div className="text-2xl font-black text-orange-600 dark:text-orange-400">{Math.round(totalCarbs)}g</div>
          </div>
          <div className="p-5 rounded-2xl bg-purple-50 dark:bg-purple-900/20">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t.fat}</div>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{Math.round(totalFat)}g</div>
          </div>
        </div>

        <h3 className="text-xl font-bold mb-4">{t.history}</h3>
        <div className="space-y-4">
          {history.map((item, i) => (
            <div key={i} className="p-4 border border-gray-100 dark:border-gray-800 rounded-xl flex justify-between items-center">
              <div>
                <div className="font-bold">{item.title}</div>
                <div className="text-sm text-gray-500">{new Date(item.timestamp).toLocaleDateString()}</div>
              </div>
              <div className="font-mono font-bold text-primary-600">{item.total.calories} {t.calories}</div>
            </div>
          ))}
          {history.length === 0 && (
            <div className="text-center text-gray-500 py-8">{t.noHistory}</div>
          )}
        </div>

        <div className="mt-8 flex justify-center">
            <button onClick={() => window.print()} className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-bold">
                {t.printReport}
            </button>
        </div>
      </div>
    </div>
  );
}

const App = () => {
  const [view, setView] = useState<'HOME' | 'SCAN' | 'RESULT' | 'SETTINGS' | 'REPORT' | 'BMI'>('HOME');
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null);
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [textInput, setTextInput] = useState("");
  
  // Settings State
  const [lang, setLang] = useState<Language>('sl');
  const [theme, setTheme] = useState<Theme>('light');
  const [colorTheme, setColorTheme] = useState<ColorTheme>('green');
  const [dailyGoal, setDailyGoal] = useState<number>(2000);
  const [dietaryPref, setDietaryPref] = useState<string>("");

  // BMI/Stats State
  const [userStats, setUserStats] = useState<UserStats>({ height: "", weight: "", bmi: null });

  // Motivational Quote State
  const [quote, setQuote] = useState("");

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    // Select a random quote when language changes or app mounts
    const quotes = QUOTES[lang];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    setQuote(randomQuote);
  }, [lang]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Apply Color Theme CSS Variables
  useEffect(() => {
    const colors = THEME_COLORS[colorTheme];
    const root = document.documentElement;
    Object.keys(colors).forEach(shade => {
      root.style.setProperty(`--color-primary-${shade}`, colors[shade]);
    });
  }, [colorTheme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const toggleLang = () => setLang(prev => prev === 'sl' ? 'en' : 'sl');

  const handleAnalyze = async (description: string, image: string | null) => {
    if (!description.trim() && !image) return;
    
    setIsAnalyzing(true);
    setError(null);

    try {
      const parts: any[] = [];
      let promptText = "";

      if (image) {
        const base64Data = image.split(',')[1];
        parts.push({ inlineData: { data: base64Data, mimeType: "image/jpeg" } });
        promptText = "Analyze this food image.";
        if (description.trim()) {
            promptText += ` The user provided this context/notes: "${description}".`;
        }
      } else {
        promptText = `Analyze this food description: "${description}".`;
      }

      promptText += ` Identify items, estimate weight in grams (if not specified, infer from standard portion sizes), and calculate nutrition. Output strictly valid JSON according to the schema. 
      IMPORTANT: ALL TEXT CONTENT (title, summary, advice, names) MUST BE IN ${lang === 'sl' ? 'SLOVENIAN (Slovenščina)' : 'ENGLISH'}.
      User Dietary Preferences/Restrictions: "${dietaryPref}". Please consider this in the 'advice' section.`;

      parts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts: parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: analysisSchema,
          thinkingConfig: { thinkingBudget: 1024 },
        }
      });

      if (response.text) {
        const data = JSON.parse(response.text);
        const result: AnalysisResult = {
          ...data,
          timestamp: Date.now(),
          image: image || undefined
        };
        setHistory(prev => [result, ...prev]);
        setCurrentAnalysis(result);
        setView('RESULT');
      } else {
        throw new Error("Empty response");
      }
    } catch (e) {
      console.error(e);
      setError(t.error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteItem = (index: number) => {
    setHistory(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearHistory = () => {
    setHistory([]);
    setView('HOME');
  };

  const handleStartScan = () => {
    setInputImage(null);
    setDescription("");
    setCurrentAnalysis(null);
    setError(null);
    setView('SCAN');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInputImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateBMI = () => {
    const h = parseFloat(userStats.height) / 100;
    const w = parseFloat(userStats.weight);
    if (h > 0 && w > 0) {
      setUserStats(prev => ({ ...prev, bmi: w / (h * h) }));
    }
  };

  if (view === 'REPORT') {
    return (
      <ReportView 
        history={history} 
        onClose={() => setView('SETTINGS')} 
        t={t}
        colorTheme={colorTheme}
      />
    );
  }

  const todayCalories = history
    .filter(item => {
      const itemDate = new Date(item.timestamp);
      const today = new Date();
      return itemDate.getDate() === today.getDate() && 
             itemDate.getMonth() === today.getMonth() && 
             itemDate.getFullYear() === today.getFullYear();
    })
    .reduce((sum, item) => sum + item.total.calories, 0);

  const progressPercent = Math.min(100, (todayCalories / dailyGoal) * 100);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 font-sans pb-24 transition-colors duration-300">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => setView('HOME')}
          >
            {/* Improved Icon: Techy Apple/Leaf */}
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary-500/30 group-hover:scale-105 group-hover:rotate-6 transition-all duration-300 relative overflow-hidden">
               {/* Shine effect */}
               <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 rounded-t-2xl pointer-events-none"></div>
               
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 z-10 drop-shadow-sm">
                 <path d="M12 2C9 2 7 3.5 7 6C7 8 8 9.5 9.5 10.5C8 12 7 14 7 16C7 19 9 21.5 12 21.5C15 21.5 17 19 17 16C17 14 16 12 14.5 10.5C16 9.5 17 8 17 6C17 3.5 15 2 12 2ZM12 4C13.5 4 14.5 4.8 14.5 6C14.5 7.2 13.5 8 12 8C10.5 8 9.5 7.2 9.5 6C9.5 4.8 10.5 4 12 4ZM12 20C10 20 8.5 18.5 8.5 16.5C8.5 14.5 10 13 12 13C14 13 15.5 14.5 15.5 16.5C15.5 18.5 14 20 12 20Z" fillOpacity="0.3" />
                 <path d="M16 3C14.5 3 13.5 4 13.5 5.5C13.5 7 14.5 8 16 8C17.5 8 18.5 7 18.5 5.5C18.5 4 17.5 3 16 3Z" className="text-white" />
                 <path d="M12 11C13.1 11 14 11.9 14 13V15.5C14 16.33 13.33 17 12.5 17C11.67 17 11 16.33 11 15.5V13C11 11.9 11.9 11 12 11Z" className="text-white" />
                 <path d="M8 5C8.55 5 9 5.45 9 6C9 7.66 7.66 9 6 9C5.45 9 5 8.55 5 8C5 6.34 6.34 5 8 5Z" className="text-white" />
               </svg>
            </div>
            
            <div className="flex flex-col">
              <span className="font-black text-xl leading-none tracking-tight text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {t.appTitle}<span className="text-primary-600 dark:text-primary-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">AI</span>
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider leading-none mt-1 truncate max-w-[120px] sm:max-w-[200px] opacity-80">{quote}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             {view === 'RESULT' || view === 'SETTINGS' || view === 'BMI' || view === 'SCAN' ? (
              <button 
                onClick={() => setView('HOME')}
                className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 px-2 py-1 flex items-center gap-1"
              >
                <span className="text-lg">✕</span>
                {t.close}
              </button>
            ) : (
              <>
                 <button 
                  onClick={toggleLang}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {lang.toUpperCase()}
                </button>
                <button 
                  onClick={toggleTheme}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {theme === 'light' ? '🌙' : '☀️'}
                </button>
                <button 
                  onClick={() => setView('SETTINGS')}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-md mx-auto px-4 py-6">
        {view === 'HOME' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-end mb-4">
                <div>
                   <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">{t.dailyIntake}</h2>
                   <div className="text-3xl font-black mt-1 text-gray-900 dark:text-white">
                      {Math.round(todayCalories)} <span className="text-lg text-gray-400 font-medium">/ {dailyGoal}</span>
                   </div>
                </div>
                <div className="text-right">
                   <div className="text-xs font-bold text-primary-600 mb-1">{Math.round(progressPercent)}%</div>
                </div>
              </div>
              <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-1000 ease-out"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Manual Entry Section */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden transition-colors">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary-100 to-transparent dark:from-primary-900/20 rounded-bl-full -mr-4 -mt-4"></div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">{t.manualEntryTitle}</h2>
                <div className="flex flex-col gap-3">
                  <textarea 
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={t.manualPlaceholder}
                    className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none text-base transition-all h-24"
                  />
                  <button 
                    onClick={() => {
                        if(textInput.trim()) {
                            handleAnalyze(textInput, null);
                            setTextInput("");
                        }
                    }}
                    disabled={!textInput.trim()}
                    className="self-end px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
                  >
                    {t.analyzeTextBtn}
                  </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                 onClick={handleStartScan}
                 className="col-span-2 p-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2 font-bold transition-all transform hover:scale-[1.02]"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                 </svg>
                 {t.scanBtn}
              </button>
            </div>

            <div className="space-y-4">
               <h3 className="font-bold text-lg text-gray-900 dark:text-white">{t.history}</h3>
               {history.length === 0 ? (
                 <div className="text-center py-10 text-gray-400 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                    <p>{t.noHistory}</p>
                    <button onClick={handleStartScan} className="mt-2 text-primary-600 font-bold text-sm">{t.startNow}</button>
                 </div>
               ) : (
                 history.map((item, idx) => (
                   <div key={idx} className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setCurrentAnalysis(item); setView('RESULT'); }}>
                      {item.image ? (
                        <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                           <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 text-2xl">
                          🍽️
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                         <h4 className="font-bold text-gray-900 dark:text-white truncate">{item.title}</h4>
                         <p className="text-xs text-gray-500 truncate">{item.summary}</p>
                         <div className="flex gap-2 mt-1">
                            <span className="text-xs font-medium text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 rounded-full">
                               {Math.round(item.total.calories)} {t.calories}
                            </span>
                            <span className="text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                               {item.health_score}/100
                            </span>
                         </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(idx); }}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                         </svg>
                      </button>
                   </div>
                 ))
               )}
            </div>
          </div>
        )}

        {view === 'SCAN' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black">{t.addPhoto}</h2>
            
            <div className="relative group">
              {inputImage ? (
                 <div className="relative rounded-3xl overflow-hidden shadow-lg aspect-square">
                    <img src={inputImage} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setInputImage(null)}
                      className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 backdrop-blur-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                 </div>
              ) : (
                <label className="block w-full aspect-square rounded-3xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-gray-800 transition-all">
                  <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-gray-700 flex items-center justify-center mb-4 text-primary-600 dark:text-primary-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span className="font-bold text-gray-500">{t.takePhoto}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              )}
            </div>

            <div>
               <label className="block font-bold mb-2 ml-1">{t.imageNotes}</label>
               <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={inputImage ? t.imageNotesPlaceholder : t.manualPlaceholder}
                  className="w-full p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 border-none focus:ring-2 focus:ring-primary-500 min-h-[100px] resize-none"
               />
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <button 
               onClick={() => handleAnalyze(description, inputImage)}
               disabled={isAnalyzing || (!inputImage && !description.trim())}
               className={`w-full py-4 rounded-xl font-black text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${
                 isAnalyzing || (!inputImage && !description.trim()) 
                 ? 'bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600' 
                 : 'bg-primary-600 text-white hover:bg-primary-700 shadow-primary-500/30'
               }`}
            >
               {isAnalyzing ? (
                 <>
                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                   {t.analyzing}
                 </>
               ) : (
                 t.analyzeTextBtn
               )}
            </button>
          </div>
        )}

        {view === 'RESULT' && currentAnalysis && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
               {currentAnalysis.image && (
                 <div className="h-48 overflow-hidden relative">
                    <img src={currentAnalysis.image} alt="Food" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                        <h2 className="text-2xl font-black text-white">{currentAnalysis.title}</h2>
                    </div>
                 </div>
               )}
               {!currentAnalysis.image && (
                 <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-2xl font-black">{currentAnalysis.title}</h2>
                 </div>
               )}
               
               <div className="p-6">
                 <div className="flex items-center justify-between mb-6">
                    <div className="flex flex-col">
                       <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.health_score}</span>
                       <span className={`text-4xl font-black ${
                          currentAnalysis.health_score >= 80 ? 'text-green-500' :
                          currentAnalysis.health_score >= 50 ? 'text-yellow-500' : 'text-red-500'
                       }`}>
                          {currentAnalysis.health_score}
                       </span>
                    </div>
                    <div className="text-right">
                       <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.total} {t.calories}</div>
                       <div className="text-3xl font-black text-gray-900 dark:text-white">
                          {Math.round(currentAnalysis.total.calories)}
                       </div>
                    </div>
                 </div>

                 {/* Macros */}
                 <div className="grid grid-cols-3 gap-2 mb-6">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
                       <div className="text-blue-600 dark:text-blue-400 font-black text-xl">{Math.round(currentAnalysis.total.protein)}g</div>
                       <div className="text-xs text-blue-400 dark:text-blue-300 font-bold uppercase">{t.proteinLabel}</div>
                    </div>
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-center">
                       <div className="text-orange-600 dark:text-orange-400 font-black text-xl">{Math.round(currentAnalysis.total.carbs)}g</div>
                       <div className="text-xs text-orange-400 dark:text-orange-300 font-bold uppercase">{t.carbs}</div>
                    </div>
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl text-center">
                       <div className="text-yellow-600 dark:text-yellow-400 font-black text-xl">{Math.round(currentAnalysis.total.fat)}g</div>
                       <div className="text-xs text-yellow-400 dark:text-yellow-300 font-bold uppercase">{t.fat}</div>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h3 className="font-bold text-lg">{t.ingredients}</h3>
                    {currentAnalysis.items.map((item, idx) => (
                       <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                          <div>
                             <div className="font-medium text-gray-900 dark:text-gray-200">{item.name}</div>
                             <div className="text-xs text-gray-500">{item.weight_g}g</div>
                          </div>
                          <div className="font-mono text-sm text-gray-600 dark:text-gray-400">{item.calories} {t.calories}</div>
                       </div>
                    ))}
                 </div>
               </div>
               
               <div className="bg-primary-50 dark:bg-primary-900/20 p-6 border-t border-primary-100 dark:border-primary-900/30">
                  <h3 className="text-primary-800 dark:text-primary-300 font-bold flex items-center gap-2 mb-2">
                     {t.adviceTitle}
                  </h3>
                  <p className="text-primary-700 dark:text-primary-200 text-sm leading-relaxed">
                     {currentAnalysis.advice}
                  </p>
               </div>
            </div>
            
            <button 
               onClick={handleStartScan}
               className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold shadow-lg"
            >
               {t.analyzeNew}
            </button>
          </div>
        )}

        {view === 'SETTINGS' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black">{t.settings}</h2>

            {/* Profile / Goals Section */}
            <div className="space-y-4">
               <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider">{t.goals}</h3>
               
               <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                  <label className="block text-sm font-bold mb-2">{t.dailyCalorieGoal}</label>
                  <input 
                    type="number" 
                    value={dailyGoal}
                    onChange={(e) => setDailyGoal(Number(e.target.value))}
                    className="w-full p-2 bg-gray-100 dark:bg-gray-800 rounded-lg"
                  />
               </div>

               <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                  <label className="block text-sm font-bold mb-2">{t.dietaryPreferences}</label>
                  <input 
                    type="text" 
                    value={dietaryPref}
                    onChange={(e) => setDietaryPref(e.target.value)}
                    placeholder={t.dietaryPlaceholder}
                    className="w-full p-2 bg-gray-100 dark:bg-gray-800 rounded-lg"
                  />
               </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider">{t.appearance}</h3>
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <button 
                  onClick={() => setColorTheme('green')} 
                  className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${colorTheme === 'green' ? 'bg-green-50 dark:bg-green-900/10' : ''}`}
                >
                   <div className="w-6 h-6 rounded-full bg-green-500"></div>
                   <span className="font-medium">Green Energy</span>
                   {colorTheme === 'green' && <span className="ml-auto text-green-600">✓</span>}
                </button>
                <div className="h-px bg-gray-100 dark:bg-gray-800"></div>
                <button 
                  onClick={() => setColorTheme('blue')} 
                  className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${colorTheme === 'blue' ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                >
                   <div className="w-6 h-6 rounded-full bg-blue-500"></div>
                   <span className="font-medium">Blue Ocean</span>
                   {colorTheme === 'blue' && <span className="ml-auto text-blue-600">✓</span>}
                </button>
                <div className="h-px bg-gray-100 dark:bg-gray-800"></div>
                <button 
                  onClick={() => setColorTheme('purple')} 
                  className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${colorTheme === 'purple' ? 'bg-purple-50 dark:bg-purple-900/10' : ''}`}
                >
                   <div className="w-6 h-6 rounded-full bg-purple-500"></div>
                   <span className="font-medium">Purple Magic</span>
                   {colorTheme === 'purple' && <span className="ml-auto text-purple-600">✓</span>}
                </button>
                 <div className="h-px bg-gray-100 dark:bg-gray-800"></div>
                <button 
                  onClick={() => setColorTheme('orange')} 
                  className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${colorTheme === 'orange' ? 'bg-orange-50 dark:bg-orange-900/10' : ''}`}
                >
                   <div className="w-6 h-6 rounded-full bg-orange-500"></div>
                   <span className="font-medium">Orange Sunset</span>
                   {colorTheme === 'orange' && <span className="ml-auto text-orange-600">✓</span>}
                </button>
              </div>
            </div>

            <div className="space-y-4">
               <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider">{t.tools}</h3>
               <button 
                 onClick={() => setView('BMI')}
                 className="w-full p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 font-bold text-left flex justify-between items-center"
               >
                 {t.bmiCalculator}
                 <span>→</span>
               </button>
               <button 
                 onClick={() => setView('REPORT')}
                 className="w-full p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 font-bold text-left flex justify-between items-center"
               >
                 {t.generateReport}
                 <span>→</span>
               </button>
            </div>

            <div className="pt-6">
               <button 
                 onClick={handleClearHistory}
                 className="w-full p-4 text-red-500 font-bold bg-red-50 dark:bg-red-900/10 rounded-2xl hover:bg-red-100 transition-colors"
               >
                 {t.clearHistory}
               </button>
            </div>
          </div>
        )}

        {view === 'BMI' && (
           <div className="space-y-6">
              <h2 className="text-2xl font-black">{t.bmiCalculator}</h2>
              <div className="p-6 bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">{t.height}</label>
                    <input 
                      type="number" 
                      value={userStats.height}
                      onChange={(e) => setUserStats(prev => ({...prev, height: e.target.value}))}
                      className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-xl"
                      placeholder="175"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">{t.weight}</label>
                    <input 
                      type="number" 
                      value={userStats.weight}
                      onChange={(e) => setUserStats(prev => ({...prev, weight: e.target.value}))}
                      className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-xl"
                      placeholder="70"
                    />
                  </div>
                  <button 
                    onClick={calculateBMI}
                    className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold"
                  >
                    {t.calculate}
                  </button>

                  {userStats.bmi && (
                    <div className="mt-6 text-center p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                       <div className="text-sm text-gray-500">{t.yourBmi}</div>
                       <div className="text-4xl font-black text-primary-600 dark:text-primary-400 my-2">{userStats.bmi.toFixed(1)}</div>
                       <div className="font-bold">
                          {userStats.bmi < 18.5 ? t.underweight : userStats.bmi < 25 ? t.normal : userStats.bmi < 30 ? t.overweight : t.obese}
                       </div>
                    </div>
                  )}
              </div>
           </div>
        )}
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);