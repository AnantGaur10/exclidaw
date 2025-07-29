"use client"

import React from "react"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "../../../..//packages/ui/src/button"
import { Card, CardContent, CardHeader } from "../../../../packages/ui/src/card"
import { Input } from "../../../../packages/ui/src/input"
import { Label } from "../../../../packages/ui/src/label"
import { Textarea } from "../../../../packages/ui/src/textarea"
import {
  Plus,
  Users,
  Loader2,
  Sparkles,
  Lock,
  Globe,
  ArrowRight,
  UserPlus,
  Search,
  Zap,
  Star,
  Shield,
  Rocket,
} from "lucide-react"

type ReturnRoomsFormat = {
  RoomName: string
  RoomID: string
  UserName: string
}

type RoomIDs = {
  roomID: ReturnRoomsFormat[]
}

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

export default function RoomManagementPage() {
  const [activeTab, setActiveTab] = useState<"create" | "join">("create")
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  // Create room state
  const [createFormData, setCreateFormData] = useState({
    name: "",
    description: "",
    isPrivate: false,
  })
  const [createError, setCreateError] = useState("")
  const [createLoading, setCreateLoading] = useState(false)

  // Join room state
  const [roomName, setRoomName] = useState("")
  const [joinError, setJoinError] = useState("")
  const [joinLoading, setJoinLoading] = useState(false)
  const [showMenu, setShowMenu] = useState<ReturnRoomsFormat[]>([])
  const [shouldShow, setShouldShow] = useState<boolean>(false)

  const router = useRouter()

  // Track mouse movement for interactive effects
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined

    setCreateFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError("")
    setCreateLoading(true)

    try {
      const response = await fetch("http://localhost/api/room", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createFormData),
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(errorData || "Failed to create room")
      }

      const { roomID } = await response.json()
      router.push(`/room/canvas/${roomID}`)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create room")
      console.error("Create room error:", err)
    } finally {
      setCreateLoading(false)
    }
  }

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setJoinError("")
    setJoinLoading(true)

    try {
      const response = await fetch(`/api/room/name?RoomName=${roomName}`, {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      const roomID: RoomIDs = await response.json()

      if (roomID.roomID.length === 1) {
        router.push(`/room/canvas/${roomID.roomID[0]?.RoomID}`)
      } else if (roomID.roomID.length > 1) {
        setShowMenu(roomID.roomID)
        setShouldShow(true)
      } else {
        setJoinError("No rooms found with that name")
        setShouldShow(false)
      }
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Failed to join room")
    } finally {
      setJoinLoading(false)
    }
  }

  const switchTab = (tab: "create" | "join") => {
    setActiveTab(tab)
    setCreateError("")
    setJoinError("")
    setShouldShow(false)
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
        {/* Large Floating Orbs */}
        <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-purple-500/15 rounded-full blur-3xl animate-float-reverse"></div>
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 rounded-full blur-3xl animate-float-slow delay-1000"></div>

        {/* Animated Mesh Grid */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(147,51,234,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.03)_1px,transparent_1px)] bg-[size:60px_60px] animate-grid-move"></div>
        </div>

        {/* Enhanced Floating Particles */}
        {Array.from({ length: 15 }).map((_, i) => (
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
        <div className="absolute top-1/4 left-1/4 animate-float opacity-30">
          <Users className="w-8 h-8 text-purple-400 animate-pulse" />
        </div>
        <div className="absolute top-1/3 right-1/3 animate-float delay-500 opacity-30">
          <Star className="w-6 h-6 text-cyan-400 animate-spin-slow" />
        </div>
        <div className="absolute bottom-1/3 left-1/5 animate-float delay-1000 opacity-30">
          <Zap className="w-7 h-7 text-pink-400 animate-bounce" />
        </div>
        <div className="absolute top-1/2 right-1/5 animate-float delay-700 opacity-30">
          <Shield className="w-6 h-6 text-emerald-400 animate-pulse" />
        </div>
        <div className="absolute bottom-1/4 right-1/3 animate-float delay-300 opacity-30">
          <Rocket className="w-5 h-5 text-orange-400 animate-bounce" />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-2xl relative group">
          {/* Enhanced Glowing Border Effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-cyan-600 to-pink-600 rounded-3xl blur-sm opacity-20 group-hover:opacity-40 transition-all duration-1000 animate-gradient-xy"></div>
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-cyan-600 to-pink-600 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>

          {/* Main Card */}
          <div className="relative bg-slate-900/95 backdrop-blur-2xl border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden">
            {/* Subtle Inner Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-cyan-500/5 rounded-3xl"></div>

            <CardHeader className="text-center space-y-8 pb-6 pt-10 relative">
              {/* Enhanced Animated Logo */}
              <div className="relative mx-auto group/logo">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-600 via-cyan-500 to-pink-600 rounded-3xl flex items-center justify-center relative overflow-hidden group-hover:scale-110 transition-all duration-500 shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-cyan-500 to-pink-600 animate-gradient-xy"></div>
                  <Users className="w-12 h-12 text-white relative z-10 drop-shadow-2xl group-hover/logo:animate-pulse" />
                  <div className="absolute inset-0 bg-white/20 rounded-3xl animate-pulse"></div>
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
                  Room Management
                </h1>
                <p className="text-slate-400 leading-relaxed text-lg animate-fade-in-up">
                  Create or join collaborative spaces
                </p>
              </div>

              {/* Tab Navigation */}
              <div className="flex bg-slate-800/50 rounded-2xl p-2 backdrop-blur-sm border border-slate-700/50">
                <button
                  onClick={() => switchTab("create")}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === "create"
                      ? "bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  <Plus className="w-5 h-5" />
                  <span>Create Room</span>
                </button>
                <button
                  onClick={() => switchTab("join")}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === "join"
                      ? "bg-gradient-to-r from-cyan-600 to-pink-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Join Room</span>
                </button>
              </div>
            </CardHeader>

            <CardContent className="space-y-8 px-8 pb-10">
              {/* Create Room Form */}
              {activeTab === "create" && (
                <div className="space-y-6 animate-fade-in-up">

                  <form onSubmit={handleCreateSubmit} className="space-y-6">
                    {/* Room Name */}
                    <div className="space-y-3">
                      <Label
                        htmlFor="name"
                        className="text-sm font-semibold text-slate-300 flex items-center space-x-2"
                      >
                        <Users className="w-4 h-4" />
                        <span>Room Name</span>
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        value={createFormData.name}
                        onChange={handleCreateChange}
                        placeholder="Enter room name"
                        className="h-12 bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20 focus:ring-4 transition-all duration-300 backdrop-blur-sm rounded-xl"
                        required
                        minLength={3}
                        maxLength={50}
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-3">
                      <Label
                        htmlFor="description"
                        className="text-sm font-semibold text-slate-300 flex items-center space-x-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Description (optional)</span>
                      </Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={createFormData.description}
                        onChange={handleCreateChange}
                        placeholder="Describe your room..."
                        className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20 focus:ring-4 transition-all duration-300 backdrop-blur-sm rounded-xl resize-none"
                        rows={3}
                        maxLength={200}
                      />
                    </div>

                    {/* Privacy Toggle */}
                    <div className="flex items-center space-x-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                      <input
                        type="checkbox"
                        id="isPrivate"
                        name="isPrivate"
                        checked={createFormData.isPrivate}
                        onChange={handleCreateChange}
                        className="w-5 h-5 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500 focus:ring-2"
                      />
                      <Label htmlFor="isPrivate" className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                        {createFormData.isPrivate ? (
                          <Lock className="w-5 h-5 text-purple-400" />
                        ) : (
                          <Globe className="w-5 h-5 text-cyan-400" />
                        )}
                        <span className="font-medium">{createFormData.isPrivate ? "Private Room" : "Public Room"}</span>
                      </Label>
                    </div>

                    {/* Create Button */}
                    <Button
                      type="submit"
                      disabled={createLoading}
                      className="w-full h-14 relative overflow-hidden bg-gradient-to-r from-purple-600 via-cyan-600 to-pink-600 hover:from-purple-700 hover:via-cyan-700 hover:to-pink-700 text-white font-bold rounded-2xl transition-all duration-500 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 group/button text-lg"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-cyan-600 to-pink-600 animate-gradient-xy"></div>
                      <div className="relative z-10 flex items-center justify-center">
                        {createLoading ? (
                          <>
                            <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                            <span className="animate-pulse">Creating Room...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="mr-3 h-5 w-5" />
                            <span>Create Room</span>
                            <ArrowRight className="ml-3 h-5 w-5 group-hover/button:translate-x-1 transition-transform duration-300" />
                          </>
                        )}
                      </div>
                      <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover/button:opacity-100 transition-opacity duration-300"></div>
                    </Button>
                  </form>
                </div>
              )}

              {/* Join Room Form */}
              {activeTab === "join" && (
                <div className="space-y-6 animate-fade-in-up">

                  <form onSubmit={handleJoinRoom} className="space-y-6">
                    {/* Room Name Search */}
                    <div className="space-y-3">
                      <Label
                        htmlFor="roomName"
                        className="text-sm font-semibold text-slate-300 flex items-center space-x-2"
                      >
                        <Search className="w-4 h-4" />
                        <span>Room Name</span>
                      </Label>
                      <Input
                        id="roomName"
                        type="text"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder="Enter room name to join"
                        className="h-12 bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20 focus:ring-4 transition-all duration-300 backdrop-blur-sm rounded-xl"
                        required
                      />
                    </div>

                    {/* Join Button */}
                    <Button
                      type="submit"
                      disabled={joinLoading}
                      className="w-full h-14 relative overflow-hidden bg-gradient-to-r from-cyan-600 via-pink-600 to-purple-600 hover:from-cyan-700 hover:via-pink-700 hover:to-purple-700 text-white font-bold rounded-2xl transition-all duration-500 transform hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/25 group/button text-lg"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-pink-600 to-purple-600 animate-gradient-xy"></div>
                      <div className="relative z-10 flex items-center justify-center">
                        {joinLoading ? (
                          <>
                            <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                            <span className="animate-pulse">Searching...</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="mr-3 h-5 w-5" />
                            <span>Join Room</span>
                            <ArrowRight className="ml-3 h-5 w-5 group-hover/button:translate-x-1 transition-transform duration-300" />
                          </>
                        )}
                      </div>
                      <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover/button:opacity-100 transition-opacity duration-300"></div>
                    </Button>
                  </form>

                  {/* Room Selection Menu */}
                  {shouldShow && (
                    <div className="mt-8 space-y-4 animate-fade-in-up">
                      <div className="text-center">
                        <h3 className="text-xl font-semibold text-white mb-2">Multiple Rooms Found</h3>
                        <p className="text-slate-400">Select the room you want to join</p>
                      </div>
                      <div className="space-y-3">
                        {showMenu.map((room, index) => (
                          <button
                            key={room.RoomID}
                            onClick={() => router.push(`/room/canvas/${room.RoomID}`)}
                            className="w-full p-4 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-slate-600 rounded-xl transition-all duration-300 group/room backdrop-blur-sm"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg flex items-center justify-center">
                                  <Users className="w-5 h-5 text-white" />
                                </div>
                                <div className="text-left">
                                  <div className="font-semibold text-white group-hover/room:text-cyan-300 transition-colors">
                                    {room.RoomName}
                                  </div>
                                  <div className="text-sm text-slate-400">Created by {room.UserName}</div>
                                </div>
                              </div>
                              <ArrowRight className="w-5 h-5 text-slate-400 group-hover/room:text-cyan-400 group-hover/room:translate-x-1 transition-all duration-300" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  )
}
