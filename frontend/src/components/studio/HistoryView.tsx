"use client";

import React, { useState } from "react";
import { Video, Trash2, Download, ExternalLink, Clock, Sparkles, FolderOpen, ArrowLeft, Check, CheckSquare, Square } from "lucide-react";
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
  onDeleteMultipleProjects?: (projectIds: string[]) => void;
  onDownloadSingle: (clip: string | ClipItemData, jobId?: string) => void;
  onBackToStudio: () => void;
  backendUrl: string;
  theme?: "light" | "dark";
}

export default function HistoryView({
  history,
  loading,
  onDeleteProject,
  onDeleteMultipleProjects,
  onDownloadSingle,
  onBackToStudio,
  backendUrl,
  theme = "dark",
}: HistoryViewProps) {
  const isLight = theme === "light";
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isAllSelected = history.length > 0 && selectedIds.size === history.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < history.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(history.map((p) => p.id)));
    }
  };

  const toggleSelectOne = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDeleteSelected = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (onDeleteMultipleProjects) {
      onDeleteMultipleProjects(ids);
    } else {
      ids.forEach((id) => onDeleteProject(id));
    }
    setSelectedIds(new Set());
  };

  const handleDeleteAll = () => {
    const allIds = history.map((p) => p.id);
    if (allIds.length === 0) return;
    if (onDeleteMultipleProjects) {
      onDeleteMultipleProjects(allIds);
    } else {
      allIds.forEach((id) => onDeleteProject(id));
    }
    setSelectedIds(new Set());
  };

  if (loading) {
    return (
      <div className="w-full max-w-5xl py-24 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-[#ff7427] border-t-transparent rounded-full animate-spin" />
        <span className={`text-sm font-medium ${isLight ? "text-slate-600" : "text-slate-400"}`}>
          Loading your generated clips...
        </span>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div
        className={`w-full max-w-2xl py-20 flex flex-col items-center text-center gap-4 p-8 rounded-3xl backdrop-blur-xl transition-colors ${
          isLight
            ? "bg-white border border-slate-200/90 shadow-sm"
            : "bg-[#101018]/60 border border-white/8"
        }`}
      >
        <div
          className={`w-16 h-16 rounded-3xl flex items-center justify-center ${
            isLight
              ? "bg-[#ff7427]/10 border border-[#ff7427]/25 text-[#ff7427]"
              : "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
          }`}
        >
          <FolderOpen className="w-8 h-8" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className={`text-xl font-bold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
            No Clips Generated Yet
          </h3>
          <p className={`text-sm max-w-md ${isLight ? "text-slate-600" : "text-slate-400"}`}>
            Paste any YouTube video or livestream link in the studio to automatically generate AI viral shorts!
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToStudio}
          className="mt-2 px-5 py-2.5 rounded-xl bg-[#ff7427] hover:bg-[#ff7427]/90 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-orange-500/20"
        >
          <Sparkles className="w-4 h-4" />
          <span>Go to Studio</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1720px] mx-auto flex flex-col gap-6 animate-in fade-in duration-200 transition-all duration-300">
      {/* Header */}
      <div
        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b ${
          isLight ? "border-slate-200" : "border-white/10"
        }`}
      >
        <div>
          <button
            type="button"
            onClick={onBackToStudio}
            className="flex items-center gap-1.5 text-xs text-[#ff7427] hover:text-[#ff7427]/80 font-semibold mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Studio</span>
          </button>
          <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
            My Generated Clips
          </h2>
          <p className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            View, re-download or manage your past AI clipping projects.
          </p>
        </div>

        <span
          className={`text-xs font-mono font-bold px-3 py-1.5 rounded-xl border ${
            isLight
              ? "bg-slate-100 border-slate-200 text-slate-700"
              : "bg-white/5 border-white/10 text-slate-400"
          }`}
        >
          {history.length} {history.length === 1 ? "Project" : "Projects"}
        </span>
      </div>

      {/* Bulk Action Toolbar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 p-3 sm:px-4 rounded-2xl border transition-all ${
          isLight
            ? "bg-slate-50/90 border-slate-200/90 shadow-sm"
            : "bg-[#101018]/90 border-white/10"
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSelectAll}
            className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              isAllSelected
                ? "bg-[#ff7427] border-[#ff7427] text-white shadow-md shadow-orange-500/20"
                : isLight
                ? "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
            }`}
          >
            {isAllSelected ? (
              <CheckSquare className="w-4 h-4" />
            ) : isSomeSelected ? (
              <div className="w-4 h-4 rounded border border-[#ff7427] bg-[#ff7427]/20 flex items-center justify-center">
                <div className="w-2 h-0.5 bg-[#ff7427] rounded" />
              </div>
            ) : (
              <Square className="w-4 h-4 opacity-60" />
            )}
            <span>{isAllSelected ? "Deselect All" : "Select All"}</span>
          </button>

          {selectedIds.size > 0 && (
            <span className="text-xs font-mono font-medium text-[#ff7427]">
              {selectedIds.size} of {history.length} selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 hover:text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title={`Delete ${selectedIds.size} selected projects`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.size})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDeleteAll}
            className={`px-3.5 py-1.5 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer border ${
              isLight
                ? "bg-rose-50 hover:bg-rose-100/80 border-rose-200 text-rose-600"
                : "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-400 hover:text-rose-300"
            }`}
            title="Delete all clipping projects"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete All ({history.length})</span>
          </button>
        </div>
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

          const isSelected = selectedIds.has(project.id);

          return (
            <div
              key={project.id}
              className={`p-5 rounded-3xl transition-all flex flex-col gap-4 border ${
                isSelected
                  ? isLight
                    ? "border-[#ff7427] ring-2 ring-[#ff7427]/40 bg-orange-50/20 shadow-md"
                    : "border-[#ff7427] ring-1 ring-[#ff7427]/40 bg-[#ff7427]/[0.03] shadow-xl"
                  : isLight
                  ? "bg-white border-slate-200/90 hover:border-slate-300 shadow-sm hover:shadow-md"
                  : "bg-[#101018] border-white/10 hover:border-[#ff7427]/30 shadow-xl"
              }`}
            >
              {/* Project Header Row */}
              <div
                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b ${
                  isLight ? "border-slate-100" : "border-white/5"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Select Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => toggleSelectOne(project.id, e)}
                    className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                      isSelected
                        ? "bg-[#ff7427] border-[#ff7427] text-white shadow-sm"
                        : isLight
                        ? "border-slate-300 hover:border-slate-400 bg-white"
                        : "border-white/20 hover:border-white/40 bg-white/5"
                    }`}
                    title={isSelected ? "Deselect project" : "Select project"}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div className="w-10 h-10 rounded-2xl bg-[#ff7427]/15 border border-[#ff7427]/30 flex items-center justify-center text-[#ff7427] shrink-0">
                    <Video className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <a
                      href={project.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-sm font-bold hover:text-[#ff7427] transition-colors flex items-center gap-1.5 truncate max-w-md ${
                        isLight ? "text-slate-900" : "text-white"
                      }`}
                    >
                      <span>{project.youtube_url}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-60" />
                    </a>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{dateFormatted}</span>
                      <span>•</span>
                      <span className="text-[#ff7427] font-semibold">
                        {project.clips_count || project.clips?.length || 0} clips
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteProject(project.id)}
                  className={`p-2 rounded-xl transition-colors cursor-pointer self-end sm:self-auto ${
                    isLight
                      ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      : "text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                  }`}
                  title="Delete Project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Clips Preview Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {project.clips &&
                  project.clips.map((clip, cIdx) => {
                    const isObj = typeof clip === "object" && clip !== null;
                    const cFilename = isObj ? clip.filename : clip;
                    const cUrl =
                      isObj && clip.url
                        ? clip.url.startsWith("http")
                          ? clip.url
                          : `${backendUrl}${clip.url}`
                        : `${backendUrl}/clips/${cFilename}`;

                    return (
                      <div
                        key={`${project.id}-clip-${cIdx}`}
                        className={`relative rounded-2xl overflow-hidden bg-black aspect-[9/16] group border ${
                          isLight ? "border-slate-200" : "border-white/10"
                        }`}
                      >
                        <video src={cUrl} preload="metadata" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                          <button
                            type="button"
                            onClick={() => onDownloadSingle(clip, project.id)}
                            className="p-2 rounded-xl bg-[#ff7427] hover:bg-[#ff7427]/90 text-white shadow-md transition-all cursor-pointer"
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
