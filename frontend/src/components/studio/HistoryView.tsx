"use client";

import React from "react";
import { Video, Trash2, Download, ExternalLink, Clock, Sparkles, FolderOpen, ArrowLeft } from "lucide-react";
import { ClipItemData } from "./ClipCard";

export interface HistoryProject {
  id: string;
  youtube_url: string;
  status: string;
  segment_duration: number;
  clips_count: number;
  clips: (string | ClipItemData)[];
  created_at: string;
}

interface HistoryViewProps {
  history: HistoryProject[];
  loading: boolean;
  onDeleteProject: (projectId: string) => void;
  onDownloadSingle: (clip: string | ClipItemData, jobId?: string) => void;
  onBackToStudio: () => void;
  backendUrl: string;
}

export default function HistoryView({
  history,
  loading,
  onDeleteProject,
  onDownloadSingle,
  onBackToStudio,
  backendUrl,
}: HistoryViewProps) {
  if (loading) {
    return (
      <div className="w-full max-w-5xl py-24 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-400 font-medium">Loading your generated clips...</span>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="w-full max-w-2xl py-20 flex flex-col items-center text-center gap-4 p-8 rounded-3xl bg-[#101018]/60 border border-white/8 backdrop-blur-xl">
        <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <FolderOpen className="w-8 h-8" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-bold text-white tracking-tight">No Clips Generated Yet</h3>
          <p className="text-sm text-slate-400 max-w-md">
            Paste any YouTube video or livestream link in the studio to automatically generate AI viral shorts!
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToStudio}
          className="mt-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/25"
        >
          <Sparkles className="w-4 h-4" />
          <span>Go to Studio</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <button
            type="button"
            onClick={onBackToStudio}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Studio</span>
          </button>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            My Generated Clips
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            View, re-download or manage your past AI clipping projects.
          </p>
        </div>

        <span className="text-xs font-mono font-bold text-slate-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
          {history.length} {history.length === 1 ? "Project" : "Projects"}
        </span>
      </div>

      {/* Projects List */}
      <div className="flex flex-col gap-5">
        {history.map((project) => {
          const dateFormatted = new Date(project.created_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={project.id}
              className="p-5 rounded-3xl bg-[#101018] border border-white/10 hover:border-indigo-500/30 transition-all flex flex-col gap-4 shadow-xl"
            >
              {/* Project Header Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                    <Video className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <a
                      href={project.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-white hover:text-indigo-400 transition-colors flex items-center gap-1.5 truncate max-w-md"
                    >
                      <span>{project.youtube_url}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-60" />
                    </a>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{dateFormatted}</span>
                      <span>•</span>
                      <span className="text-indigo-400 font-semibold">{project.clips_count || project.clips?.length || 0} clips</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteProject(project.id)}
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer self-end sm:self-auto"
                  title="Delete Project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Clips Preview Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {project.clips && project.clips.map((clip, cIdx) => {
                  const isObj = typeof clip === "object" && clip !== null;
                  const cFilename = isObj ? clip.filename : clip;
                  const cUrl = isObj && clip.url
                    ? clip.url.startsWith("http")
                      ? clip.url
                      : `${backendUrl}${clip.url}`
                    : `${backendUrl}/clips/${cFilename}`;

                  return (
                    <div
                      key={`${project.id}-clip-${cIdx}`}
                      className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] group border border-white/10"
                    >
                      <video
                        src={cUrl}
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                        <button
                          type="button"
                          onClick={() => onDownloadSingle(clip, project.id)}
                          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all cursor-pointer"
                          title="Download Clip"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
