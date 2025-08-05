"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "../../../../../packages/ui/src/button"
import { Card, CardContent, CardFooter, CardHeader } from "../../../../../packages/ui/src/card"
import { Input } from "../../../../../packages/ui/src/input"
import { Label } from "../../../../../packages/ui/src/label"
import {
  LogIn,
  Loader2,
  Sparkles,
  Zap,
  Star,
  Mail,
  Lock,
  ArrowRight,
  Shield,
  Rocket,
  Key,
} from "lucide-react"

// Floating particle component
const FloatingParticle = ({ delay = 0, duration = 3000, className = "" }) => {
  return (
    <div
      className={`absolute animate-float opacity-60 ${className}`}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}ms`,
      }}
    >
      <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full blur-sm animate-pulse" />
    </div>
  )
}

export default function SigninPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [focusedField, setFocusedField] = useState("")
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const router = useRouter()

  // Track mouse movement for interactive effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/signin", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      router.push("/room")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signin failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Dynamic Background with Mouse Interaction */}
      <div
        className="absolute inset-0 transition-all duration-1000 ease-out"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(147, 51, 234, 0.15), transparent 40%)`,
        }}
      />

      {/* Enhanced Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Large Floating Orbs with Better Animation */}
        <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-purple-500/15 rounded-full blur-3xl animate-float-reverse"></div>
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 rounded-full blur-3xl animate-float-slow delay-1000"></div>

        {/* Animated Mesh Grid */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(147,51,234,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.03)_1px,transparent_1px)] bg-[size:60px_60px] animate-grid-move"></div>
        </div>

        {/* Enhanced Floating Particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <FloatingParticle
            key={i}
            delay={i * 200}
            duration={3000 + i * 100}
            className={`
              ${i % 4 === 0 ? "top-1/4 left-1/4" : ""}
              ${i % 4 === 1 ? "top-1/3 right-1/3" : ""}
              ${i % 4 === 2 ? "bottom-1/3 left-1/5" : ""}
              ${i % 4 === 3 ? "top-2/3 right-1/4" : ""}
            `}
          />
        ))}

        {/* Animated Icons */}
        <div className="absolute top-1/4 left-1/4 animate-float opacity-40">
          <Key className="w-8 h-8 text-purple-400 animate-spin-slow" />
        </div>
        <div className="absolute top-1/3 right-1/3 animate-float delay-500 opacity-40">
          <Star className="w-6 h-6 text-cyan-400 animate-pulse" />
        </div>
        <div className="absolute bottom-1/3 left-1/5 animate-float delay-1000 opacity-40">
          <Zap className="w-7 h-7 text-pink-400 animate-bounce" />
        </div>
        <div className="absolute top-1/2 right-1/5 animate-float delay-700 opacity-40">
          <Shield className="w-6 h-6 text-emerald-400 animate-pulse" />
        </div>
        <div className="absolute bottom-1/4 right-1/3 animate-float delay-300 opacity-40">
          <Rocket className="w-5 h-5 text-orange-400 animate-bounce" />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md relative group">
          {/* Enhanced Glowing Border Effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-cyan-600 to-pink-600 rounded-3xl blur-sm opacity-20 group-hover:opacity-40 transition-all duration-1000 animate-gradient-xy"></div>
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-cyan-600 to-pink-600 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>

          {/* Main Card with Enhanced Backdrop */}
          <div className="relative bg-slate-900/95 backdrop-blur-2xl border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden">
            {/* Subtle Inner Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-cyan-500/5 rounded-3xl"></div>

            <CardHeader className="text-center space-y-8 pb-8 pt-10 relative">
              {/* Enhanced Animated Logo */}
              <div className="relative mx-auto group/logo">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-600 via-cyan-500 to-pink-600 rounded-3xl flex items-center justify-center relative overflow-hidden group-hover:scale-110 transition-all duration-500 shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-cyan-500 to-pink-600 animate-gradient-xy"></div>
                  <LogIn className="w-12 h-12 text-white relative z-10 drop-shadow-2xl group-hover/logo:animate-pulse" />
                  <div className="absolute inset-0 bg-white/20 rounded-3xl animate-pulse"></div>
                  {/* Inner rotating ring */}
                  <div className="absolute inset-2 border-2 border-white/30 rounded-2xl animate-spin-slow"></div>
                </div>
                {/* Multiple floating rings */}
                <div className="absolute -inset-3 border-2 border-purple-500/20 rounded-full animate-spin-slow"></div>
                <div className="absolute -inset-4 border border-cyan-500/20 rounded-full animate-spin-reverse"></div>
                <div className="absolute -inset-6 border border-pink-500/10 rounded-full animate-spin-slow delay-500"></div>
              </div>

              {/* Enhanced Headlines */}
              <div className="space-y-4">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent animate-shimmer">
                  Welcome Back
                </h1>
                <p className="text-slate-400 leading-relaxed text-lg animate-fade-in-up">
                  Sign in to continue your journey
                </p>
                <div className="flex items-center justify-center space-x-2 text-sm text-slate-500">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Secure Login</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-8 px-8">
              {/* Enhanced Error Message */}
              {/* {error && (
                <Alert
                  variant="destructive"
                  className="border-red-500/50 bg-red-500/10 backdrop-blur-sm animate-shake relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent animate-pulse"></div>
                  <AlertCircle className="h-5 w-5 animate-pulse" />
                  <AlertDescription className="text-red-200 font-medium relative z-10">{error}</AlertDescription>
                </Alert>
              )} */}

              {/* Enhanced Form */}
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Email Field */}
                <div className="space-y-3 group/field">
                  <Label
                    htmlFor="email"
                    className={`text-sm font-semibold transition-all duration-300 flex items-center space-x-2 ${
                      focusedField === "email" ? "text-purple-400" : "text-slate-300"
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email address</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => setFocusedField("")}
                      placeholder="Enter your email"
                      className="h-14 bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20 focus:ring-4 transition-all duration-300 backdrop-blur-sm rounded-xl text-lg"
                      required
                    />
                    <div
                      className={`absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600/0 via-purple-600/10 to-cyan-600/0 transition-opacity duration-300 pointer-events-none ${
                        focusedField === "email" ? "opacity-100" : "opacity-0"
                      }`}
                    ></div>
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-3 group/field">
                  <Label
                    htmlFor="password"
                    className={`text-sm font-semibold transition-all duration-300 flex items-center space-x-2 ${
                      focusedField === "password" ? "text-cyan-400" : "text-slate-300"
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    <span>Password</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField("")}
                      placeholder="Enter your password"
                      className="h-14 bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20 focus:ring-4 transition-all duration-300 backdrop-blur-sm rounded-xl text-lg"
                      required
                    />
                    <div
                      className={`absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-600/0 via-cyan-600/10 to-purple-600/0 transition-opacity duration-300 pointer-events-none ${
                        focusedField === "password" ? "opacity-100" : "opacity-0"
                      }`}
                    ></div>
                  </div>
                </div>

                {/* Epic Enhanced Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-16 relative overflow-hidden bg-gradient-to-r from-purple-600 via-cyan-600 to-pink-600 hover:from-purple-700 hover:via-cyan-700 hover:to-pink-700 text-white font-bold rounded-2xl transition-all duration-500 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 group/button text-lg"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-cyan-600 to-pink-600 animate-gradient-xy"></div>
                  <div className="relative z-10 flex items-center justify-center">
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                        <span className="animate-pulse">Signing In...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="ml-3 h-5 w-5 group-hover/button:translate-x-1 transition-transform duration-300" />
                        <Sparkles className="ml-2 h-5 w-5 group-hover/button:animate-spin" />
                      </>
                    )}
                  </div>
                  {/* Enhanced Button Glow Effect */}
                  <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover/button:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-cyan-600 to-pink-600 rounded-2xl blur opacity-0 group-hover/button:opacity-50 transition-opacity duration-300"></div>
                </Button>

                {/* Forgot Password Link */}
                <div className="text-center">
                  <button
                    type="button"
                    className="text-sm text-slate-400 hover:text-purple-400 transition-colors duration-300 underline decoration-slate-400/30 hover:decoration-purple-400/50"
                  >
                    Forgot your password?
                  </button>
                </div>
              </form>
            </CardContent>

            <CardFooter className="pt-0 pb-10 px-8">
              <div className="w-full text-center space-y-4">
                <div className="flex items-center justify-center space-x-4 text-xs text-slate-500">
                  <div className="flex items-center space-x-1">
                    <Shield className="w-3 h-3 text-emerald-400" />
                    <span>256-bit SSL</span>
                  </div>
                  <div className="w-1 h-1 bg-slate-600 rounded-full"></div>
                  <div className="flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-blue-400" />
                    <span>Secure Login</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 animate-fade-in leading-relaxed">
                  Don't have an account?{" "}
                  <button
                    onClick={() => router.push("/signup")}
                    className="text-purple-400 hover:text-purple-300 cursor-pointer transition-colors underline decoration-purple-400/30 hover:decoration-purple-300 font-medium"
                  >
                    Create one here
                  </button>
                </p>
              </div>
            </CardFooter>
          </div>
        </Card>
      </div>
    </div>
  )
}
