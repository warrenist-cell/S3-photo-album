import React, { useState } from "react";
import { AlbumItem } from "../types";
import { Folder, FolderPlus, Grid, Image as ImageIcon, Search, ChevronRight, Plus } from "lucide-react";

interface AlbumGridProps {
  albums: AlbumItem[];
  activeAlbumId: string | null;
  onSelectAlbum: (albumId: string | null) => void;
  onCreateAlbum: (name: string) => Promise<void>;
  loading: boolean;
}

export default function AlbumGrid({
  albums,
  activeAlbumId,
  onSelectAlbum,
  onCreateAlbum,
  loading,
}: AlbumGridProps) {
  const [newAlbumName, setNewAlbumName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumName.trim()) return;
    setCreating(true);
    try {
      await onCreateAlbum(newAlbumName.trim());
      setNewAlbumName("");
      setShowCreateForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const filteredAlbums = albums.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="album-grid-root" className="space-y-6">
      {/* Search and Action Bar - styled styled as clean white bento card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Search albums..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 text-slate-800 placeholder-slate-400 rounded-2xl py-2.5 pl-10 pr-4 text-xs focus:outline-none transition-colors animate-none"
            id="album-search-input"
          />
        </div>

        <div className="flex items-center space-x-2">
          {showCreateForm ? (
            <form onSubmit={handleCreate} className="flex items-center space-x-2 animate-fade-in">
              <input
                type="text"
                required
                placeholder="Album name..."
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                className="bg-slate-50 border border-slate-200 focus:border-indigo-500 text-slate-800 placeholder-slate-400 rounded-2xl py-2.5 px-4 text-xs focus:outline-none transition-colors"
                id="new-album-name-field"
                disabled={creating}
              />
              <button
                type="submit"
                disabled={creating}
                className="bg-indigo-600 hover:bg-indigo-555 text-white font-bold text-xs py-2.5 px-4 rounded-2xl transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                id="confirm-album-btn"
              >
                {creating ? "Creating..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="text-slate-500 hover:text-slate-850 text-xs py-2 px-2"
                id="cancel-album-btn"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-indigo-600 hover:bg-indigo-550 text-white py-2.5 px-4 rounded-2xl text-xs flex items-center space-x-2 font-bold transition-all cursor-pointer shadow-sm shadow-indigo-650/10"
              id="show-album-form-btn"
            >
              <FolderPlus size={14} className="text-white" />
              <span>Create Virtual Album</span>
            </button>
          )}

          {activeAlbumId !== null && (
            <button
              onClick={() => onSelectAlbum(null)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 px-4 rounded-2xl text-xs flex items-center space-x-1.5 font-bold transition-colors cursor-pointer"
              id="view-all-albums-btn"
            >
              <Grid size={13} />
              <span>Show All</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-3xl h-48 animate-pulse shadow-sm" />
          ))}
        </div>
      ) : filteredAlbums.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500 shadow-sm space-y-2">
          <Folder size={32} className="mx-auto text-slate-300" />
          <p className="font-bold text-slate-800 text-sm">No albums discovered</p>
          <p className="text-xs max-w-xs mx-auto">Create a virtual S3 album (or namespace folder) to begin uploading secure photo backups.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {filteredAlbums.map((a) => {
            const isActive = activeAlbumId === a.id;
            return (
              <button
                key={a.id}
                onClick={() => onSelectAlbum(isActive ? null : a.id)}
                className={`group relative text-left bg-white border rounded-3xl overflow-hidden transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow p-2 ${
                  isActive 
                    ? "border-indigo-600 ring-2 ring-indigo-600/10" 
                    : "border-slate-200 hover:border-indigo-200"
                }`}
                id={`album-card-${a.id}`}
              >
                {/* Virtual Album Cover */}
                <div className="aspect-square bg-slate-50 relative overflow-hidden flex items-center justify-center rounded-2xl">
                  {a.coverUrl ? (
                    <img
                      src={a.coverUrl}
                      alt={a.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 text-slate-400 flex flex-col items-center justify-center p-6 text-center space-y-2 w-full h-full">
                      <div className="bg-white p-4 rounded-2xl group-hover:scale-110 transition-transform duration-300 border border-slate-200 text-slate-400 group-hover:text-indigo-600 shadow-sm">
                        <Folder size={28} />
                      </div>
                    </div>
                  )}

                  {/* Glass Photo Count Badge */}
                  <span className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm border border-slate-200/50 text-[10px] font-semibold text-slate-750 px-2.5 py-1 rounded-full flex items-center space-x-1 shadow-sm">
                    <ImageIcon size={10} className="text-indigo-600" />
                    <span>{a.photoCount}</span>
                  </span>
                </div>

                {/* Details Footer */}
                <div className="p-3 space-y-0.5 flex items-center justify-between">
                  <div className="space-y-0.5 overflow-hidden">
                    <h4 className="font-sans font-bold text-sm text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                      {a.name}
                    </h4>
                    <p className="text-[9px] text-slate-400 font-mono truncate">
                      {a.prefix}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0 pl-1" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
