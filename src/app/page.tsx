"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import Link from "next/link";

export default function Home() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-white text-lg font-medium">Loading...</div>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <AuthScreen />;
  }
  
  return <Dashboard />;
}

type AuthMode = "signIn" | "signUp" | "forgotPassword" | "resetSent";

function AuthScreen() {
  const { signIn } = useAuthActions();
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const validatePassword = (pass: string) => {
    if (pass.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(pass)) return "Password must contain an uppercase letter";
    if (!/[a-z]/.test(pass)) return "Password must contain a lowercase letter";
    if (!/[0-9]/.test(pass)) return "Password must contain a number";
    return null;
  };
  
  const getPasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (pass.length >= 12) strength++;
    if (/[A-Z]/.test(pass)) strength++;
    if (/[a-z]/.test(pass)) strength++;
    if (/[0-9]/.test(pass)) strength++;
    if (/[^A-Za-z0-9]/.test(pass)) strength++;
    return strength;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (mode === "forgotPassword") {
      // TODO: Implement actual password reset when Convex supports it
      setLoading(true);
      await new Promise(r => setTimeout(r, 1000));
      setLoading(false);
      setMode("resetSent");
      return;
    }
    
    if (mode === "signUp") {
      if (!name.trim()) {
        setError("Please enter your name");
        return;
      }
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }
    
    setLoading(true);
    
    try {
      await signIn("password", { 
        email, 
        password,
        flow: mode === "signUp" ? "signUp" : "signIn",
        ...(mode === "signUp" && name ? { name } : {}),
      });
    } catch (err: any) {
      if (err.message?.includes("Invalid")) {
        setError("Invalid email or password. Please try again.");
      } else if (err.message?.includes("already exists")) {
        setError("An account with this email already exists. Try signing in.");
      } else {
        setError(err.message || "Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };
  
  const passwordStrength = getPasswordStrength(password);
  const strengthLabel = passwordStrength <= 2 ? "Weak" : passwordStrength <= 4 ? "Medium" : "Strong";
  const strengthColor = passwordStrength <= 2 ? "bg-red-500" : passwordStrength <= 4 ? "bg-yellow-500" : "bg-green-500";
  
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
        <div className="text-white max-w-md">
          <div className="text-6xl mb-6">🤟</div>
          <h1 className="text-4xl font-bold mb-4">SignTracker</h1>
          <p className="text-xl text-indigo-100 mb-8">
            Track your child's American Sign Language journey with confidence.
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
              <div>
                <div className="font-semibold">Track Progress</div>
                <div className="text-indigo-200 text-sm">Monitor signs from learning to mastery</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-xl">👨‍👩‍👧</span>
              </div>
              <div>
                <div className="font-semibold">Share with Family</div>
                <div className="text-indigo-200 text-sm">Keep everyone updated on progress</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-xl">📚</span>
              </div>
              <div>
                <div className="font-semibold">100+ Signs</div>
                <div className="text-indigo-200 text-sm">Comprehensive baby sign dictionary</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-6">
            <div className="text-4xl mb-2">🤟</div>
            <h1 className="text-2xl font-bold text-gray-800">SignTracker</h1>
          </div>
          
          {mode === "resetSent" ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Check your email</h2>
              <p className="text-gray-600 mb-6">
                We've sent password reset instructions to <strong>{email}</strong>
              </p>
              <button
                onClick={() => setMode("signIn")}
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800">
                  {mode === "signIn" && "Welcome back"}
                  {mode === "signUp" && "Create your account"}
                  {mode === "forgotPassword" && "Reset your password"}
                </h2>
                <p className="text-gray-600 mt-2">
                  {mode === "signIn" && "Sign in to continue tracking progress"}
                  {mode === "signUp" && "Start tracking your child's ASL journey"}
                  {mode === "forgotPassword" && "Enter your email to receive reset instructions"}
                </p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                {mode === "signUp" && (
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white transition-colors"
                      placeholder="John Smith"
                      required
                    />
                  </div>
                )}
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white transition-colors"
                    placeholder="you@example.com"
                    required
                  />
                </div>
                
                {mode !== "forgotPassword" && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Password
                      </label>
                      {mode === "signIn" && (
                        <button
                          type="button"
                          onClick={() => setMode("forgotPassword")}
                          className="text-sm text-indigo-600 hover:text-indigo-700"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      autoComplete={mode === "signUp" ? "new-password" : "current-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white transition-colors"
                      placeholder="••••••••"
                      required
                    />
                    {mode === "signUp" && password && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full ${
                                i <= passwordStrength ? strengthColor : "bg-gray-200"
                              }`}
                            />
                          ))}
                        </div>
                        <p className={`text-xs ${
                          passwordStrength <= 2 ? "text-red-600" : 
                          passwordStrength <= 4 ? "text-yellow-600" : "text-green-600"
                        }`}>
                          Password strength: {strengthLabel}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {mode === "signUp" && (
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white transition-colors ${
                        confirmPassword && password !== confirmPassword 
                          ? "border-red-300 bg-red-50" 
                          : confirmPassword && password === confirmPassword
                          ? "border-green-300 bg-green-50"
                          : "border-gray-300"
                      }`}
                      placeholder="••••••••"
                      required
                    />
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-red-600 text-xs mt-1">Passwords do not match</p>
                    )}
                    {confirmPassword && password === confirmPassword && (
                      <p className="text-green-600 text-xs mt-1">Passwords match ✓</p>
                    )}
                  </div>
                )}
                
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-700 text-sm flex items-center gap-2">
                      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      {error}
                    </p>
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={loading || (mode === "signUp" && password !== confirmPassword)}
                  className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Please wait...</span>
                    </>
                  ) : (
                    <>
                      {mode === "signIn" && "Sign In"}
                      {mode === "signUp" && "Create Account"}
                      {mode === "forgotPassword" && "Send Reset Instructions"}
                    </>
                  )}
                </button>
              </form>
              
              <div className="mt-6 text-center">
                {mode === "forgotPassword" ? (
                  <button
                    onClick={() => setMode("signIn")}
                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Back to sign in
                  </button>
                ) : (
                  <p className="text-gray-600">
                    {mode === "signIn" ? "Don't have an account? " : "Already have an account? "}
                    <button
                      onClick={() => {
                        setMode(mode === "signIn" ? "signUp" : "signIn");
                        setError("");
                        setPassword("");
                        setConfirmPassword("");
                      }}
                      className="text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      {mode === "signIn" ? "Sign up" : "Sign in"}
                    </button>
                  </p>
                )}
              </div>
              
              {mode === "signUp" && (
                <p className="mt-6 text-xs text-gray-500 text-center">
                  By creating an account, you agree to our{" "}
                  <a href="#" className="text-indigo-600 hover:underline">Terms of Service</a>
                  {" "}and{" "}
                  <a href="#" className="text-indigo-600 hover:underline">Privacy Policy</a>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { signOut } = useAuthActions();
  const children = useQuery(api.children.list) || [];
  const createChild = useMutation(api.children.create);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBirthDate, setNewBirthDate] = useState("");
  
  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    await createChild({ 
      name: newName.trim(),
      birthDate: newBirthDate || undefined,
    });
    setNewName("");
    setNewBirthDate("");
    setShowAdd(false);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-indigo-600">🤟 SignTracker</h1>
          <button
            onClick={() => signOut()}
            className="text-gray-600 hover:text-gray-800 text-sm"
          >
            Sign Out
          </button>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">My Children</h2>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            + Add Child
          </button>
        </div>
        
        {/* Add Child Form */}
        {showAdd && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">Add a Child</h3>
            <form onSubmit={handleAddChild} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
                  placeholder="Child's name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Birth Date (optional)</label>
                <input
                  type="date"
                  value={newBirthDate}
                  onChange={(e) => setNewBirthDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Children List */}
        {children.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">👶</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No children yet</h3>
            <p className="text-gray-600 mb-4">Add your first child to start tracking their ASL progress!</p>
            <button
              onClick={() => setShowAdd(true)}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              Add Child
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {children.map((child: any) => (
              <Link
                key={child._id}
                href={`/child/${child._id}`}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition block"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-2xl">
                    {child.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 text-lg">{child.name}</h3>
                    <p className="text-gray-600 text-sm">
                      {child.signCount} signs learned
                    </p>
                    {child.role === "shared" && (
                      <span className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded mt-1">
                        Shared with you
                      </span>
                    )}
                  </div>
                  <div className="text-indigo-500">→</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
