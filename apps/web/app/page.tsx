"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link" // <-- IMPORTED: For correct client-side navigation
import { useRouter } from "next/navigation"
import { Slot } from "@radix-ui/react-slot" // <-- IMPORTED: Helper for the Button component
import {
  Palette,
  Users,
  Zap,
  Star,
  ArrowRight,
  Sparkles,
  Shield,
  Rocket,
  Globe,
  Brush,
  Share2,
  Clock,
  CheckCircle,
  Play,
  UserPlus,
  PenTool,
  Layers,
  Download,
  Eye,
} from "lucide-react"

// ============================================================================
// INLINED UI COMPONENTS (For a single-file solution)
// In a real project, these would be in separate files like `packages/ui/src/*`
// ============================================================================

// --- Button Component ---
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${className}`}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

// --- Card Components ---
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props} />
  )
)
CardHeader.displayName = "CardHeader"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={`p-6 pt-0 ${className}`} {...props} />
)
CardContent.displayName = "CardContent"

// ============================================================================
// ORIGINAL PAGE COMPONENTS (Unchanged)
// ============================================================================

// Floating particle component
const FloatingParticle = ({ delay = 0, duration = 3000, className = "" }) => {
  return (
    <div
      className={`absolute animate-float opacity-40 ${className}`}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}ms`,
      }}
    >
      <div className="w-1.5 h-1.5 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full blur-sm animate-pulse" />
    </div>
  )
}

// Feature card component
//@ts-ignore
const FeatureCard = ({ icon: Icon, title, description, delay = 0 }) => {
  return (
    <Card
      className="group relative overflow-hidden border-slate-700/50 bg-slate-900/50 backdrop-blur-xl hover:bg-slate-800/50 transition-all duration-500 hover:scale-105"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/20 via-cyan-600/20 to-pink-600/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
      <div className="relative">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-600 via-cyan-500 to-pink-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
            <Icon className="w-8 h-8 text-white drop-shadow-lg" />
          </div>
          <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">{title}</h3>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-slate-400 leading-relaxed">{description}</p>
        </CardContent>
      </div>
    </Card>
  )
}

// Step component for how it works section
//@ts-ignore
const StepCard = ({ number, title, description, icon: Icon }) => {
  return (
    <div className="relative group">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="relative">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-600 via-cyan-500 to-pink-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Icon className="w-10 h-10 text-white drop-shadow-lg" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {number}
          </div>
        </div>
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <p className="text-slate-400 leading-relaxed max-w-sm">{description}</p>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN HOME PAGE EXPORT
// ============================================================================

export default function HomePage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const router = useRouter() // Kept in case you need it for other programmatic navigation

  // Track mouse movement for interactive effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

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
        <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-purple-500/15 rounded-full blur-3xl animate-float-reverse"></div>
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 rounded-full blur-3xl animate-float-slow delay-1000"></div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(147,51,234,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.03)_1px,transparent_1px)] bg-[size:60px_60px] animate-grid-move"></div>
        </div>
        {Array.from({ length: 25 }).map((_, i) => (
          <FloatingParticle
            key={i}
            delay={i * 200}
            duration={3000 + i * 100}
            className={`
              ${i % 5 === 0 ? "top-1/4 left-1/4" : ""}
              ${i % 5 === 1 ? "top-1/3 right-1/3" : ""}
              ${i % 5 === 2 ? "bottom-1/3 left-1/5" : ""}
              ${i % 5 === 3 ? "top-2/3 right-1/4" : ""}
              ${i % 5 === 4 ? "top-1/2 left-1/2" : ""}
            `}
          />
        ))}
        <div className="absolute top-1/4 left-1/4 animate-float opacity-30">
          <Palette className="w-8 h-8 text-purple-400 animate-spin-slow" />
        </div>
        <div className="absolute top-1/3 right-1/3 animate-float delay-500 opacity-30">
          <Star className="w-6 h-6 text-cyan-400 animate-pulse" />
        </div>
        <div className="absolute bottom-1/3 left-1/5 animate-float delay-1000 opacity-30">
          <Brush className="w-7 h-7 text-pink-400 animate-bounce" />
        </div>
        <div className="absolute top-1/2 right-1/5 animate-float delay-700 opacity-30">
          <Users className="w-6 h-6 text-emerald-400 animate-pulse" />
        </div>
        <div className="absolute bottom-1/4 right-1/3 animate-float delay-300 opacity-30">
          <Rocket className="w-5 h-5 text-orange-400 animate-bounce" />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="flex justify-between items-center p-6 md:p-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 via-cyan-500 to-pink-600 rounded-xl flex items-center justify-center">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">
              DrawBoard
            </span>
          </div>
          <div className="flex items-center space-x-4">
            {/* CORRECTED: Using Link for navigation */}
            <Link href="/signin" passHref>
              <Button className="text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all duration-300">
                Sign In
              </Button>
            </Link>
            {/* CORRECTED: Using Link for navigation */}
            <Link href="/signup" passHref>
              <Button className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white font-semibold px-6 py-2 rounded-xl transition-all duration-300 hover:scale-105">
                Get Started
              </Button>
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="text-center py-20 px-4 md:px-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent animate-shimmer leading-tight">
                Collaborate & Create
                <br />
                <span className="bg-gradient-to-r from-purple-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
                  Together
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-slate-400 leading-relaxed max-w-3xl mx-auto animate-fade-in-up">
                The ultimate collaborative whiteboard where teams come together to brainstorm, design, and bring ideas
                to life in real-time.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 animate-fade-in-up">
              {/* CORRECTED: Using Link for navigation */}
              <Link href="/signup" passHref>
                <Button className="w-full sm:w-auto h-16 px-8 relative overflow-hidden bg-gradient-to-r from-purple-600 via-cyan-600 to-pink-600 hover:from-purple-700 hover:via-cyan-700 hover:to-pink-700 text-white font-bold rounded-2xl transition-all duration-500 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 group text-lg">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-cyan-600 to-pink-600 animate-gradient-xy"></div>
                  <div className="relative z-10 flex items-center justify-center">
                    <span>Start Creating</span>
                    <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                    <Sparkles className="ml-2 h-5 w-5 group-hover:animate-spin" />
                  </div>
                </Button>
              </Link>
              <Button className="w-full sm:w-auto h-16 px-8 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800/50 backdrop-blur-sm rounded-2xl transition-all duration-300 text-lg bg-transparent">
                <Play className="mr-3 h-5 w-5" />
                Watch Demo
              </Button>
            </div>

            <div className="flex items-center justify-center space-x-8 text-sm text-slate-500 animate-fade-in">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Secure & Private</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span>Real-time Sync</span>
              </div>
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-blue-400" />
                <span>Works Anywhere</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 md:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent mb-6">
                Powerful Features
              </h2>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                Everything you need for seamless collaboration and creative expression
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                icon={Users}
                title="Real-time Collaboration"
                description="Work together with your team in real-time. See cursors, edits, and changes as they happen."
                delay={0}
              />
              <FeatureCard
                icon={Brush}
                title="Advanced Drawing Tools"
                description="Professional drawing tools including brushes, shapes, text, and layers for unlimited creativity."
                delay={200}
              />
              <FeatureCard
                icon={Share2}
                title="Easy Room Sharing"
                description="Create private or public rooms and invite collaborators with a simple link or room code."
                delay={400}
              />
              <FeatureCard
                icon={Clock}
                title="Auto-save & History"
                description="Never lose your work with automatic saving and version history to track changes."
                delay={600}
              />
              <FeatureCard
                icon={Layers}
                title="Infinite Canvas"
                description="Unlimited space to express your ideas with zoom, pan, and organize content in layers."
                delay={800}
              />
              <FeatureCard
                icon={Download}
                title="Export & Share"
                description="Export your creations in multiple formats and share them with anyone, anywhere."
                delay={1000}
              />
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 px-4 md:px-8 bg-slate-900/20 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent mb-6">
                How It Works
              </h2>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                Get started in three simple steps and begin collaborating instantly
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <StepCard
                number="1"
                icon={UserPlus}
                title="Create Account"
                description="Sign up for free and join thousands of creators already using DrawBoard for collaboration."
              />
              <StepCard
                number="2"
                icon={Users}
                title="Create or Join Room"
                description="Start a new drawing room or join an existing one using a room code or invitation link."
              />
              <StepCard
                number="3"
                icon={PenTool}
                title="Start Creating"
                description="Use our powerful tools to draw, design, and collaborate with your team in real-time."
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <Card className="relative overflow-hidden border-slate-700/50 bg-slate-900/50 backdrop-blur-xl">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-cyan-600 to-pink-600 rounded-3xl blur opacity-20 animate-gradient-xy"></div>
              <div className="relative p-12">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">
                      Ready to Start Creating?
                    </h2>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                      Join thousands of teams already using DrawBoard to bring their ideas to life through collaborative
                      creativity.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
                    {/* CORRECTED: Using Link for navigation */}
                    <Link href="/signup" passHref>
                      <Button className="w-full sm:w-auto h-16 px-8 relative overflow-hidden bg-gradient-to-r from-purple-600 via-cyan-600 to-pink-600 hover:from-purple-700 hover:via-cyan-700 hover:to-pink-700 text-white font-bold rounded-2xl transition-all duration-500 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 group text-lg">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-cyan-600 to-pink-600 animate-gradient-xy"></div>
                        <div className="relative z-10 flex items-center justify-center">
                          <span>Get Started Free</span>
                          <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                        </div>
                      </Button>
                    </Link>
                    {/* CORRECTED: Using Link for navigation */}
                    <Link href="/signin" passHref>
                      <Button className="w-full sm:w-auto h-16 px-8 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800/50 backdrop-blur-sm rounded-2xl transition-all duration-300 text-lg">
                        <Eye className="mr-3 h-5 w-5" />
                        Sign In
                      </Button>
                    </Link>
                  </div>

                  <div className="flex items-center justify-center space-x-8 text-sm text-slate-500">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Free to start</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>No credit card required</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Unlimited rooms</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-4 md:px-8 border-t border-slate-800/50">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 via-cyan-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <Palette className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">
                  DrawBoard
                </span>
              </div>
              <div className="text-slate-500 text-sm">© 2024 DrawBoard. All rights reserved.</div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}