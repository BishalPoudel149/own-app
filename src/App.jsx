import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import {
  PlusCircle,
  Trash2,
  Edit2,
  PieChart as PieChartIcon,
  List,
  DollarSign,
  Calendar,
  Tag,
  Utensils,
  Shirt,
  Plane,
  Zap,
  Film,
  MoreHorizontal,
  X,
  LogOut,
  LogIn
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import logo from './assets/Expense_tracker.svg';

// --- Utility ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- Firebase Setup ---
// Use Vite environment variables for Firebase config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

const APP_ID = import.meta.env.VITE_APP_ID || 'default-app-id';

// --- Constants ---
const CURRENCIES = [
  { code: 'USD', symbol: '$', label: '$', decimals: 2 },
  { code: 'INR', symbol: '₹', label: '₹', decimals: 0 },
];

const CATEGORIES = [
  { id: 'Food', label: 'Grocery/Food', icon: Utensils, color: '#FF6B6B' },
  { id: 'Clothes', label: 'Clothes', icon: Shirt, color: '#4ECDC4' },
  { id: 'Travel', label: 'Travel', icon: Plane, color: '#45B7D1' },
  { id: 'Utilities', label: 'Utilities', icon: Zap, color: '#F7B731' },
  { id: 'Entertainment', label: 'Entertainment', icon: Film, color: '#A55EEA' },
  { id: 'Other', label: 'Other', icon: Tag, color: '#95A5A6' },
];

// --- Components ---

const Button = ({ children, variant = 'primary', className, ...props }) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm',
    ghost: 'text-slate-600 hover:bg-slate-100',
    google: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm flex items-center justify-center gap-3 font-medium',
  };

  return (
    <button
      className={cn(
        'px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ label, icon: Icon, className, ...props }) => (
  <div className={cn("flex flex-col gap-1.5", className)}>
    {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
    <div className="relative">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <Icon size={18} />
        </div>
      )}
      <input
        className={cn(
          "w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all",
          Icon && "pl-10"
        )}
        {...props}
      />
    </div>
  </div>
);

const Select = ({ label, options, value, onChange, icon: Icon }) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
    <div className="relative">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <Icon size={18} />
        </div>
      )}
      <select
        value={value}
        onChange={onChange}
        className={cn(
          "w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none",
          Icon && "pl-10"
        )}
      >
        {options.map(opt => (
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <MoreHorizontal size={16} />
      </div>
    </div>
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-semibold text-lg text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const SignIn = ({ onSignIn }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
      <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
        <img src={logo} alt="Logo" className="w-12 h-12 object-contain" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back</h1>
      <p className="text-slate-500 mb-8">Sign in to keep track of your personal expenses and manage your budget effectively.</p>

      <Button variant="google" onClick={onSignIn} className="w-full py-3">
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26-.19-.58z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Sign in with Google
      </Button>
    </div>
  </div>
);

// --- Main App Component ---

export default function App() {
  const [user, setUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('record'); // 'record' | 'report'
  const [currency, setCurrency] = useState(CURRENCIES[0]); // Default USD

  // Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Edit/Delete State
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Report State
  const [reportMonth, setReportMonth] = useState(format(new Date(), 'yyyy-MM'));

  // --- Helper ---
  const formatMoney = (amount) => {
    return `${currency.symbol}${amount.toLocaleString(undefined, {
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals
    })}`;
  };

  // Dynamic Currency Icon Component
  const CurrencyIcon = ({ size = 18, className }) => (
    <span className={cn("font-semibold flex items-center justify-center", className)} style={{ fontSize: size, width: size, height: size }}>
      {currency.symbol}
    </span>
  );

  // --- Auth & Data Sync ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load User Settings
  useEffect(() => {
    if (!user) return;
    const userSettingsRef = doc(db, `artifacts/${APP_ID}/users/${user.uid}/settings`, 'preferences');
    const unsubscribe = onSnapshot(userSettingsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.currency) {
          const savedCurrency = CURRENCIES.find(c => c.code === data.currency);
          if (savedCurrency) setCurrency(savedCurrency);
        }
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setExpenses([]);
      return;
    }

    const path = `artifacts/${APP_ID}/users/${user.uid}/expenses`;
    console.log("Listening to Firestore path:", path);

    const q = query(
      collection(db, path),
      orderBy('date', 'desc'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("Snapshot received. Docs count:", snapshot.docs.length);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setExpenses(data);
    }, (error) => {
      console.error("Snapshot error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // --- Actions ---

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Sign in failed:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  const handleCurrencyChange = async (e) => {
    const newCode = e.target.value;
    const newCurrency = CURRENCIES.find(c => c.code === newCode);
    setCurrency(newCurrency);

    if (user) {
      const userSettingsRef = doc(db, `artifacts/${APP_ID}/users/${user.uid}/settings`, 'preferences');
      await setDoc(userSettingsRef, { currency: newCode }, { merge: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !amount) return;

    try {
      const expenseData = {
        title,
        amount: parseFloat(amount),
        category,
        date: date || format(new Date(), 'yyyy-MM-dd'),
        updatedAt: serverTimestamp(),
      };

      const path = `artifacts/${APP_ID}/users/${user.uid}/expenses`;
      console.log("Saving to path:", path);

      if (editingId) {
        await updateDoc(doc(db, path, editingId), expenseData);
        setEditingId(null);
      } else {
        await addDoc(collection(db, path), {
          ...expenseData,
          createdAt: serverTimestamp(),
        });
      }

      console.log("Save successful");

      // Reset form
      setTitle('');
      setAmount('');
      setCategory(CATEGORIES[0].id);
      setDate(format(new Date(), 'yyyy-MM-dd'));
    } catch (error) {
      console.error("Error saving expense:", error);
      alert(`Error saving: ${error.message}`); // Visible feedback
    }
  };

  const handleEdit = (expense) => {
    setTitle(expense.title);
    setAmount(expense.amount);
    setCategory(expense.category);
    setDate(expense.date);
    setEditingId(expense.id);
    setView('record'); // Switch back to record view if editing from somewhere else
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, `artifacts/${APP_ID}/users/${user.uid}/expenses`, deletingId));
      setDeletingId(null);
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };

  // --- Derived State for Reports ---

  const reportData = useMemo(() => {
    const [year, month] = reportMonth.split('-');
    const start = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
    const end = endOfMonth(new Date(parseInt(year), parseInt(month) - 1));

    const filtered = expenses.filter(e =>
      isWithinInterval(parseISO(e.date), { start, end })
    );

    const total = filtered.reduce((sum, e) => sum + e.amount, 0);

    const byCategory = filtered.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});

    const chartData = Object.entries(byCategory).map(([catId, value]) => {
      const cat = CATEGORIES.find(c => c.id === catId) || { label: catId, color: '#999' };
      return {
        name: cat.label,
        value,
        color: cat.color
      };
    }).sort((a, b) => b.value - a.value);

    const highestCategory = chartData.length > 0 ? chartData[0] : null;

    return { total, chartData, highestCategory };
  }, [expenses, reportMonth]);

  // --- Render ---

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return <SignIn onSignIn={handleSignIn} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 md:pb-0">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl shadow-slate-200/50 overflow-hidden flex flex-col">

        {/* Header */}
        <header className="bg-indigo-600 text-white p-6 pb-12 rounded-b-[2.5rem] shadow-lg relative z-10">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Logo" className="h-8 w-8 object-contain brightness-0 invert" />
              <h1 className="text-2xl font-bold tracking-tight">Expense<span className="text-indigo-200">Tracker</span></h1>
            </div>
            <div className="flex items-center gap-3">
              {/* Currency Selector */}
              <select
                value={currency.code}
                onChange={handleCurrencyChange}
                className="bg-indigo-500/50 text-white border border-indigo-400/30 rounded-lg px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/20 cursor-pointer appearance-none text-center min-w-[3rem]"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code} className="text-slate-900">{c.label}</option>
                ))}
              </select>

              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/20 shadow-sm">
                <img
                  src={user.photoURL || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.uid}&backgroundColor=b6e3f4`}
                  alt={user.displayName || 'User'}
                  className="h-full w-full object-cover"
                />
              </div>
              <button
                onClick={handleSignOut}
                className="text-indigo-200 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                title="Sign Out"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>

          {view === 'record' ? (
            <div className="text-center">
              <p className="text-indigo-100 text-sm font-medium mb-1">Total Spent This Month</p>
              <div className="text-4xl font-bold tracking-tight">
                {formatMoney(reportData.total)}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-indigo-100 text-sm font-medium mb-1">Report for</p>
              <input
                type="month"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                className="bg-indigo-500/30 text-white border-none rounded px-3 py-1 font-semibold focus:ring-2 focus:ring-white/50 outline-none cursor-pointer"
              />
            </div>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 -mt-6 px-4 relative z-20 overflow-y-auto no-scrollbar">

          {view === 'record' && (
            <>
              {/* Input Form */}
              <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5 mb-6">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <Input
                    placeholder="What did you buy?"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    icon={Tag}
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="number"
                      placeholder="0"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      icon={CurrencyIcon} // Use dynamic icon
                      step="0.01"
                      required
                    />
                    <Input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      required
                    />
                  </div>
                  <Select
                    options={CATEGORIES}
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    icon={List}
                  />

                  <div className="flex gap-2 mt-2">
                    {editingId && (
                      <Button type="button" variant="secondary" onClick={() => {
                        setEditingId(null);
                        setTitle('');
                        setAmount('');
                        setCategory(CATEGORIES[0].id);
                        setDate(format(new Date(), 'yyyy-MM-dd'));
                      }} className="flex-1">
                        Cancel
                      </Button>
                    )}
                    <Button type="submit" className="flex-1">
                      {editingId ? <><Edit2 size={18} /> Update Expense</> : <><PlusCircle size={18} /> Add Expense</>}
                    </Button>
                  </div>
                </form>
              </div>

              {/* List */}
              <div className="flex flex-col gap-3 pb-6">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider ml-1">Recent Transactions</h3>
                {expenses.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p>No expenses yet.</p>
                  </div>
                ) : (
                  expenses.map(expense => {
                    const CatIcon = CATEGORIES.find(c => c.id === expense.category)?.icon || Tag;
                    const catColor = CATEGORIES.find(c => c.id === expense.category)?.color || '#999';

                    return (
                      <div key={expense.id} className="group bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: catColor }}>
                            <CatIcon size={18} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900">{expense.title}</h4>
                            <p className="text-xs text-slate-500">{format(parseISO(expense.date), 'MMM d, yyyy')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-slate-900">
                            -{formatMoney(expense.amount)}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity md:opacity-100">
                            <button onClick={() => handleEdit(expense)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => setDeletingId(expense.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {view === 'report' && (
            <div className="flex flex-col gap-6 pb-6 pt-2">
              {/* Key Stat */}
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                <p className="text-indigo-100 text-sm font-medium mb-1">Highest Spend Category</p>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">{reportData.highestCategory?.name || 'N/A'}</h3>
                    <p className="text-indigo-100 text-sm">
                      {reportData.highestCategory
                        ? `${((reportData.highestCategory.value / reportData.total) * 100).toFixed(1)}% of total`
                        : 'No data'}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Zap size={24} />
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="font-semibold text-slate-900 mb-6">Category Breakdown</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData.chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {reportData.chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatMoney(value)}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {reportData.chartData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-600 truncate">{item.name}</span>
                      <span className="ml-auto font-medium text-slate-900">{formatMoney(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Navigation */}
        <nav className="bg-white border-t border-slate-100 px-6 py-3 flex justify-around items-center absolute bottom-0 w-full md:relative md:rounded-b-2xl">
          <button
            onClick={() => setView('record')}
            className={cn(
              "flex flex-col items-center gap-1 text-xs font-medium transition-colors",
              view === 'record' ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <div className={cn("p-2 rounded-full transition-all", view === 'record' ? "bg-indigo-50" : "")}>
              <List size={24} />
            </div>
            Records
          </button>

          <div className="w-px h-8 bg-slate-100" />

          <button
            onClick={() => setView('report')}
            className={cn(
              "flex flex-col items-center gap-1 text-xs font-medium transition-colors",
              view === 'report' ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <div className={cn("p-2 rounded-full transition-all", view === 'report' ? "bg-indigo-50" : "")}>
              <PieChartIcon size={24} />
            </div>
            Reports
          </button>
        </nav>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={!!deletingId}
          onClose={() => setDeletingId(null)}
          title="Delete Expense"
        >
          <div className="flex flex-col gap-4">
            <p className="text-slate-600">
              Are you sure you want to delete this expense? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end mt-2">
              <Button variant="secondary" onClick={() => setDeletingId(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
        </Modal>

      </div>
    </div>
  );
}
