'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  X, 
  Trash2, 
  RotateCw, 
  Clock, 
  ExternalLink, 
  ShieldCheck, 
  User, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import type { SearchHistoryRecord } from '@/lib/supabase';
import { SavedProfileCards } from './SavedProfileCards';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
  onSelectScan: (record: SearchHistoryRecord) => void;
}

export function HistoryDrawer({ isOpen, onClose, deviceId, onSelectScan }: HistoryDrawerProps) {
  const [history, setHistory] = useState<SearchHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<SearchHistoryRecord | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!deviceId) return;
    setIsLoading(true);
    setFetchError(null);

    try {
      const res = await fetch(`/api/history?deviceId=${encodeURIComponent(deviceId)}`, {
        headers: {
          'x-device-id': deviceId,
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.history)) {
        setHistory(data.history);
      } else {
        setFetchError(data.error || 'Unable to retrieve scan archive.');
      }
    } catch (err: unknown) {
      console.error('Failed to fetch history:', err);
      setFetchError('Network error retrieving history.');
    } finally {
      setIsLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    const timer = setTimeout(async () => {
      if (!deviceId) return;
      setIsLoading(true);
      setFetchError(null);
      setSelectedRecord(null);

      try {
        const res = await fetch(`/api/history?deviceId=${encodeURIComponent(deviceId)}`, {
          headers: {
            'x-device-id': deviceId,
          },
        });
        const data = await res.json();
        if (active) {
          if (data.success && Array.isArray(data.history)) {
            setHistory(data.history);
          } else {
            setFetchError(data.error || 'Unable to retrieve scan archive.');
          }
        }
      } catch (err: unknown) {
        if (active) {
          console.error('Failed to fetch history:', err);
          setFetchError('Network error retrieving history.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, deviceId]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (selectedRecord) {
          setSelectedRecord(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedRecord, onClose]);

  const handleDelete = async (e: React.MouseEvent, id?: string) => {
    e.stopPropagation();
    if (!id) return;

    setDeletingId(id);
    // Optimistic removal
    const previous = [...history];
    setHistory((prev) => prev.filter((item) => item.id !== id));
    if (selectedRecord?.id === id) {
      setSelectedRecord(null);
    }

    try {
      const res = await fetch(`/api/history?id=${encodeURIComponent(id)}&deviceId=${encodeURIComponent(deviceId)}`, {
        method: 'DELETE',
        headers: {
          'x-device-id': deviceId,
        },
      });
      const data = await res.json();
      if (!data.success) {
        // Rollback on failure
        console.warn('Delete failed:', data.error);
        setHistory(previous);
      }
    } catch (err) {
      console.error('Delete request failed:', err);
      setHistory(previous);
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenReportFromDrawer = (record: SearchHistoryRecord) => {
    onSelectScan(record);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Drawer */}
      <aside 
        className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-md bg-black border-l border-neutral-900 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out"
        role="dialog"
        aria-label="Scan History"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 pt-7 pb-4 border-b border-neutral-900">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs tracking-[0.3em] font-medium text-white uppercase font-mono">
                SCAN ARCHIVE
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-400 font-mono">
                {history.length}
              </span>
            </div>
            <span className="text-[9px] tracking-[0.2em] text-neutral-500 uppercase font-light mt-0.5">
              LOCAL DEVICE INTEL
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="refresh-history-btn"
              type="button"
              onClick={fetchHistory}
              disabled={isLoading}
              className="p-2 rounded-full text-neutral-500 hover:text-white hover:bg-neutral-900 transition-colors disabled:opacity-50"
              title="Refresh History"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
            <button
              id="close-history-btn"
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-neutral-500 hover:text-white hover:bg-neutral-900 transition-colors"
              title="Close Archive"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedRecord ? (
            <SavedProfileCards
              record={selectedRecord}
              onBack={() => setSelectedRecord(null)}
              onOpenFullReport={() => handleOpenReportFromDrawer(selectedRecord)}
            />
          ) : (
            <>
              {isLoading && history.length === 0 && (
                <div className="space-y-3 py-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-900/60 flex items-center gap-3 animate-pulse"
                    >
                      <div className="w-12 h-12 rounded-xl bg-neutral-900" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-24 bg-neutral-900 rounded" />
                        <div className="h-2.5 w-40 bg-neutral-900/60 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {fetchError && (
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-900 flex items-start gap-2.5 mb-4">
                  <AlertCircle className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-neutral-300">Archive Notice</span>
                    <span className="text-[11px] text-neutral-500 font-light mt-0.5">{fetchError}</span>
                  </div>
                </div>
              )}

              {!isLoading && history.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16 px-4">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-950 border border-neutral-900 flex items-center justify-center mb-4">
                    <Clock className="w-6 h-6 text-neutral-600" />
                  </div>
                  <span className="text-xs tracking-[0.2em] font-medium text-white uppercase font-mono mb-2">
                    No Scans Recorded
                  </span>
                  <p className="text-xs text-neutral-500 font-light leading-relaxed max-w-[260px]">
                    Completed facial scans and verified social profiles for this device will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => {
                    const candidateThumb =
                      item.social_links?.find((l) => l.thumbnail)?.thumbnail;
                    const dateFormatted = item.created_at
                      ? new Date(item.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Past Scan';

                    const profilesCount = item.social_links?.length || 0;

                    return (
                      <div
                        key={item.id || item.created_at}
                        id={`history-item-${item.id}`}
                        onClick={() => setSelectedRecord(item)}
                        className="group relative p-3.5 rounded-2xl bg-neutral-950 border border-neutral-900 hover:border-neutral-800 transition-all duration-200 cursor-pointer flex items-center justify-between gap-3.5"
                      >
                        {/* Left: Thumbnail & Metadata */}
                        <div className="flex items-center gap-3 min-w-0">
                          {candidateThumb ? (
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={candidateThumb}
                                alt="Scan subject"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-center shrink-0">
                              <User className="w-5 h-5 text-neutral-500" />
                            </div>
                          )}

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono text-neutral-400">
                                {dateFormatted}
                              </span>
                              {profilesCount > 0 && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-950/60 text-blue-400 border border-blue-900/40">
                                  <ShieldCheck className="w-2.5 h-2.5" />
                                  <span>{profilesCount}</span>
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-neutral-300 font-light truncate mt-1 max-w-[200px]">
                              {profilesCount > 0
                                ? item.social_links?.map((l) => l.platform).join(' • ')
                                : item.face_description
                                ? item.face_description.slice(0, 40) + '...'
                                : 'Facial Vector Scan'}
                            </p>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            id={`delete-history-${item.id}`}
                            type="button"
                            onClick={(e) => handleDelete(e, item.id)}
                            disabled={deletingId === item.id}
                            className="p-2 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-neutral-900/80 transition-colors"
                            title="Delete Scan Record"
                            aria-label="Delete scan record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-neutral-900/80 bg-neutral-950/40 flex items-center justify-between text-[10px] font-mono text-neutral-500">
          <span className="truncate max-w-[240px]">ID: {deviceId.slice(0, 18)}...</span>
          <span>DEVICE ENCRYPTED</span>
        </div>
      </aside>
    </div>
  );
}
