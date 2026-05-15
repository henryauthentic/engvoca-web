"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Clock, Eye, Users, BookOpen } from "lucide-react";
import { VIDEOS, VIDEO_CATEGORIES } from "@/data/mockVideos";

export default function ListenPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showSubs, setShowSubs] = useState(true);

  const filteredVideos = activeCategory === "all"
    ? VIDEOS
    : VIDEOS.filter((v) => v.category === activeCategory);

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground mb-2">
          🎧 Trung tâm <span className="gradient-text">Nghe</span>
        </h1>
        <p className="text-gray-500 text-sm">Học tiếng Anh qua Video và Podcast có phụ đề song ngữ.</p>
      </motion.div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {VIDEO_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeCategory === cat.id
                ? "bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-md"
                : "bg-surface-elevated border border-border-color text-gray-600 hover:border-primary-300"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Video player (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          {selectedVideo ? (
            <>
              {/* Player */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl">
                <iframe
                  src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=0&rel=0`}
                  title={selectedVideo.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </motion.div>

              {/* Video info */}
              <div className="portal-card p-5">
                <h2 className="text-lg font-bold text-foreground mb-1">{selectedVideo.title}</h2>
                <p className="text-sm text-gray-500 mb-3">{selectedVideo.titleVi}</p>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {selectedVideo.duration}</span>
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {selectedVideo.views}</span>
                  <span className="px-2 py-0.5 bg-primary-100 text-primary-600 rounded-full font-semibold">{selectedVideo.level}</span>
                </div>
              </div>

              {/* Subtitles */}
              <div className="portal-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground">📝 Subtitle song ngữ</h3>
                  <button
                    onClick={() => setShowSubs(!showSubs)}
                    className="text-xs text-primary-500 hover:text-primary-600 cursor-pointer font-medium"
                  >
                    {showSubs ? "Ẩn tiếng Việt" : "Hiện tiếng Việt"}
                  </button>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {selectedVideo.subtitles.map((sub, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-xl hover:bg-primary-50 transition-colors cursor-pointer group">
                      <span className="text-[10px] text-gray-400 font-mono w-10 flex-shrink-0 mt-1">{sub.time}</span>
                      <div className="flex-1">
                        <p className="text-sm text-foreground group-hover:text-primary-600 transition-colors">{sub.en}</p>
                        {showSubs && <p className="text-xs text-gray-400 mt-1">{sub.vi}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="portal-card p-12 text-center">
              <div className="text-6xl mb-4">🎬</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Chọn video để bắt đầu</h3>
              <p className="text-sm text-gray-500">Chọn một video từ danh sách bên phải để xem và luyện nghe.</p>
            </div>
          )}
        </div>

        {/* Video list (1/3) */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 mb-3">Danh sách video ({filteredVideos.length})</h3>
          {filteredVideos.map((video, i) => (
            <motion.button
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => setSelectedVideo(video)}
              className={`w-full text-left portal-card overflow-hidden group cursor-pointer ${
                selectedVideo?.id === video.id ? "!border-primary-400 !bg-primary-50" : ""
              }`}
            >
              <div className="aspect-video relative overflow-hidden">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="w-5 h-5 text-primary-600 ml-0.5" />
                  </div>
                </div>
                <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded">
                  {video.duration}
                </span>
              </div>
              <div className="p-3">
                <h4 className="text-xs font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-primary-600 transition-colors">
                  {video.title}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  <span>{video.views} views</span>
                  <span className="px-1.5 py-0.5 bg-primary-50 text-primary-600 rounded font-semibold">{video.level}</span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
