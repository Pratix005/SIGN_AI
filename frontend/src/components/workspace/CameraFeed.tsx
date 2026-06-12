import { Camera, CameraOff } from "lucide-react";

interface CameraFeedProps {
  isActive: boolean;
  onToggle: () => void;
  className?: string;
  overlay?: React.ReactNode;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  overlayRef?: React.RefObject<HTMLCanvasElement | null>;
}

export function CameraFeed({ isActive, onToggle, className = "", overlay, videoRef, overlayRef }: CameraFeedProps) {
  return (
    <div 
      className={`relative overflow-hidden rounded-xl bg-card border-2 flex items-center justify-center transition-all duration-300 ${
        isActive ? 'border-primary shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'border-card-border'
      } ${className}`}
    >
      {/* Real camera feed background - mounted always, visible only when active */}
      <div 
        className={`absolute inset-0 bg-[#0a0a0f] overflow-hidden transition-opacity duration-300 ${
          isActive ? 'opacity-100 pointer-events-auto z-10' : 'opacity-0 pointer-events-none z-0'
        }`}
      >
        <video 
          ref={videoRef} 
          className="absolute inset-0 w-full h-full object-contain -scale-x-100" 
          muted 
          playsInline 
        />
        <canvas 
          ref={overlayRef} 
          className="absolute inset-0 w-full h-full object-contain -scale-x-100 pointer-events-none z-20" 
        />
        <div className="absolute inset-0 border border-white/5 rounded-xl m-4 pointer-events-none" />
        {/* Corner crosshairs */}
        <div className="absolute top-6 left-6 w-4 h-4 border-t-2 border-l-2 border-primary/50" />
        <div className="absolute top-6 right-6 w-4 h-4 border-t-2 border-r-2 border-primary/50" />
        <div className="absolute bottom-6 left-6 w-4 h-4 border-b-2 border-l-2 border-primary/50" />
        <div className="absolute bottom-6 right-6 w-4 h-4 border-b-2 border-r-2 border-primary/50" />
      </div>
      
      {/* Custom Overlay (e.g. skeleton for detected sign) */}
      {isActive && overlay && (
        <div className="absolute inset-0 z-20">
          {overlay}
        </div>
      )}
      
      {/* Status Indicator */}
      {isActive && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 z-30">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="text-xs font-medium text-white/90">REC</span>
        </div>
      )}

      {/* Inactive state placeholder */}
      {!isActive && (
        <div className="flex flex-col items-center justify-center text-muted-foreground z-10">
          <CameraOff className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-sm font-medium">Camera Inactive</p>
        </div>
      )}
      
      {!isActive && (
        <button
          onClick={onToggle}
          data-testid="button-start-camera"
          className="absolute inset-0 w-full h-full z-30 cursor-pointer opacity-0 hover:opacity-100 bg-primary/10 transition-opacity flex items-center justify-center"
        >
          <div className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-medium shadow-lg transform hover:scale-105 transition-transform flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Start Camera
          </div>
        </button>
      )}
    </div>
  );
}
