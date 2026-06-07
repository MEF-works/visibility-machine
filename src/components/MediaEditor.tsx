import React, { useState, useEffect } from 'react';
import { MediaFile, ProofArtifact } from '../types';
import { api } from '../lib/api';
import {
  Scissors, Crop, Check, Sliders, Type, Play, Pause, Video,
  Layers, Film, Loader2, AlertCircle,
} from 'lucide-react';

interface MediaEditorProps {
  onUpdateMediaFile?: (media: MediaFile) => void;
}

export function MediaEditor({ onUpdateMediaFile }: MediaEditorProps) {
  const [proof, setProof] = useState<ProofArtifact[]>([]);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCrop, setActiveCrop] = useState<'1:1' | '16:9' | '9:16' | 'free'>('9:16');
  const [activeFilter, setActiveFilter] = useState<'normal' | 'vintage' | 'vibrant' | 'grayscale' | 'cinematic'>('normal');
  const [textOverlay, setTextOverlay] = useState('');
  const [videoPlayState, setVideoPlayState] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    api.listProof()
      .then(artifacts => {
        setProof(artifacts);
        const media: MediaFile[] = artifacts
          .filter(a => a.url && (a.type === 'screenshot' || a.type === 'video'))
          .map(a => ({
            id: a.id,
            name: a.title,
            type: a.type === 'video' ? 'video' : 'image',
            url: a.url!,
            proofArtifactId: a.id,
          }));
        setMediaFiles(media);
        if (media[0]) setSelectedMedia(media[0]);
      })
      .catch(() => setProof([]))
      .finally(() => setLoading(false));
  }, []);

  const FILTER_CLASSES = {
    normal: '', vintage: 'sepia contrast-110 saturate-90 brightness-95',
    vibrant: 'contrast-125 saturate-150', grayscale: 'grayscale contrast-115',
    cinematic: 'brightness-90 contrast-120 hue-rotate-15 saturate-110',
  };

  const ASPECT_RATIO_BOX = {
    '1:1': 'aspect-square max-w-[320px]',
    '16:9': 'aspect-video w-full',
    '9:16': 'aspect-[9/16] max-h-[460px] w-auto mx-auto',
    'free': 'aspect-auto max-h-[460px] w-full',
  };

  const handleExport = () => {
    if (!selectedMedia) return;
    const edited: MediaFile = {
      ...selectedMedia,
      id: `edited-${selectedMedia.id}-${Date.now()}`,
      name: `${selectedMedia.name} (edited)`,
      edits: { crop: activeCrop, filter: activeFilter, textOverlay },
    };
    onUpdateMediaFile?.(edited);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading clip builder...
      </div>
    );
  }

  return (
    <div id="clip-builder-view" className="space-y-6">
      <div className="border-b border-slate-800/50 pb-5">
        <h2 className="text-3xl font-display font-black text-slate-100 flex items-center gap-2.5">
          <Scissors className="w-8 h-8 text-brand-cyan" /> Clip Builder
        </h2>
        <p className="text-slate-400 text-xs mt-1">
          Preview and frame proof from your vault. Full transcoding coming later — v1 handles crop, filter, and overlay preview.
        </p>
      </div>

      {mediaFiles.length === 0 ? (
        <div className="tactical-panel rounded-2xl p-12 text-center">
          <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-xs font-mono">No media in Proof Vault yet. Add screenshot or video URLs in Proof Vault first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-12 tactical-panel p-4 rounded-2xl flex gap-2 overflow-x-auto">
            {mediaFiles.map(m => (
              <button key={m.id} onClick={() => setSelectedMedia(m)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-mono whitespace-nowrap ${selectedMedia?.id === m.id ? 'bg-brand-cyan/15 border-brand-cyan text-white' : 'bg-slate-950 border-slate-850 text-slate-400'}`}>
                {m.type === 'video' ? <Video className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                {m.name.slice(0, 30)}
              </button>
            ))}
          </div>

          {selectedMedia && (
            <>
              <div className="lg:col-span-7 bg-slate-950 border border-slate-900 rounded-2xl p-5 flex items-center justify-center min-h-[400px]">
                <div className={`${ASPECT_RATIO_BOX[activeCrop]} border-2 border-dashed border-slate-800 rounded-xl overflow-hidden relative`}>
                  {selectedMedia.type === 'video' ? (
                    <video ref={videoRef} src={selectedMedia.url} className={`w-full h-full object-cover ${FILTER_CLASSES[activeFilter]}`} loop muted playsInline />
                  ) : (
                    <img src={selectedMedia.url} alt={selectedMedia.name} className={`w-full h-full object-cover ${FILTER_CLASSES[activeFilter]}`} />
                  )}
                  {textOverlay && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                      <p className="font-black text-white text-sm uppercase bg-slate-950/85 px-3 py-1.5 rounded-lg border border-brand-amber/40 font-mono">{textOverlay}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-5 space-y-4">
                <div className="tactical-panel rounded-2xl p-5 space-y-3">
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2"><Crop className="w-4 h-4 text-brand-amber" /> Aspect</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {(['1:1', '16:9', '9:16', 'free'] as const).map(ratio => (
                      <button key={ratio} onClick={() => setActiveCrop(ratio)}
                        className={`py-2 rounded-xl border text-xs font-mono ${activeCrop === ratio ? 'bg-brand-amber/15 border-brand-amber text-brand-amber' : 'bg-slate-950 border-slate-850 text-slate-400'}`}>
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="tactical-panel rounded-2xl p-5 space-y-3">
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2"><Sliders className="w-4 h-4 text-brand-cyan" /> Filter</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {(['normal', 'vintage', 'vibrant', 'grayscale', 'cinematic'] as const).map(fil => (
                      <button key={fil} onClick={() => setActiveFilter(fil)}
                        className={`py-2 rounded-lg border text-[11px] font-mono capitalize ${activeFilter === fil ? 'bg-brand-cyan/15 border-brand-cyan text-brand-cyan' : 'bg-slate-950 border-slate-850 text-slate-500'}`}>
                        {fil}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="tactical-panel rounded-2xl p-5">
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-2"><Type className="w-4 h-4" /> Overlay</h4>
                  <input value={textOverlay} onChange={e => setTextOverlay(e.target.value)} placeholder="VISIBILITY MACHINE"
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs font-mono text-slate-200" />
                </div>
                <button onClick={handleExport}
                  className="w-full bg-emerald-500 hover:bg-emerald-500/90 text-slate-950 font-black py-3 rounded-xl text-xs flex items-center justify-center gap-2">
                  <Film className="w-4 h-4" /> Save Edit Metadata
                </button>
                {exportSuccess && (
                  <p className="text-emerald-400 text-xs font-mono text-center">Edit saved locally (metadata only in v1).</p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
