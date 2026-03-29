"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Check, Plus, Trash2, Crosshair, Type, List, 
  Calendar, PenTool, Hash, LayoutPanelLeft, Save 
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAppStore } from '@/store/useAppStore';

type FieldType = 'text' | 'number' | 'date' | 'checkbox' | 'signature';

interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fieldName: string;
  fieldType: FieldType;
}

export default function TemplateBuilderPage() {
  const router = useRouter();
  const { sessionId } = useAppStore();
  
  const [templateName, setTemplateName] = useState('');
  const [department, setDepartment] = useState('Revenue');
  const [boxes, setBoxes] = useState<BoundingBox[]>([]);
  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Drawing state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

  const startDrawing = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentBox({ x, y, w: 0, h: 0 });
  };

  const draw = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !canvasRef.current || !currentBox) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = ((e.clientX - rect.left) / rect.width) * 100;
    const currentY = ((e.clientY - rect.top) / rect.height) * 100;

    const x = Math.min(startPos.x, currentX);
    const y = Math.min(startPos.y, currentY);
    const w = Math.abs(currentX - startPos.x);
    const h = Math.abs(currentY - startPos.y);

    setCurrentBox({ x, y, w, h });
  };

  const endDrawing = () => {
    if (!isDrawing || !currentBox) return;
    setIsDrawing(false);
    
    // Ignore tiny accidental clicks
    if (currentBox.w < 2 || currentBox.h < 2) {
      setCurrentBox(null);
      return;
    }

    const newId = `field_${Date.now()}`;
    const newBox: BoundingBox = {
      id: newId,
      x: currentBox.x,
      y: currentBox.y,
      width: currentBox.w,
      height: currentBox.h,
      fieldName: `Field ${boxes.length + 1}`,
      fieldType: 'text'
    };

    setBoxes([...boxes, newBox]);
    setActiveBoxId(newId);
    setCurrentBox(null);
  };

  const updateBox = (id: string, updates: Partial<BoundingBox>) => {
    setBoxes(boxes.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const deleteBox = (id: string) => {
    setBoxes(boxes.filter(b => b.id !== id));
    if (activeBoxId === id) setActiveBoxId(null);
  };

  const handleSubmit = async () => {
    if (!templateName.trim()) {
      toast.error('Please provide a Template Name');
      return;
    }
    if (boxes.length === 0) {
      toast.error('Please draw at least one field on the document to extract.');
      return;
    }

    setSubmitting(true);
    // Simulate API call to POST /templates
    await new Promise(r => setTimeout(r, 1500));
    
    toast.success('Template submitted for Admin approval!');
    
    // Navigate back to profile or dashboard
    router.replace('/profile');
  };

  const getIconForType = (type: FieldType) => {
    switch (type) {
      case 'text': return <Type size={14} />;
      case 'number': return <Hash size={14} />;
      case 'date': return <Calendar size={14} />;
      case 'checkbox': return <Check size={14} />;
      case 'signature': return <PenTool size={14} />;
    }
  };

  // Full screen takeover trick to hide the layout Navbar
  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-bg)] flex flex-col font-sans">
      {/* Top Bar */}
      <div className="h-16 border-b border-[var(--color-ghost-border)] bg-[var(--color-surface)] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()} 
            className="w-8 h-8 rounded-full border border-[var(--color-ghost-border)] flex items-center justify-center text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-bg)] hover:bg-[var(--color-surface-high)] transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-lg font-serif font-bold text-[var(--color-on-bg)] leading-tight">Template Builder</h1>
            <p className="text-xs text-[var(--color-on-surface-variant)]">Define OCR extraction zones for new form structures.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-[var(--color-on-surface-variant)] hidden sm:block">
            <span className="text-[var(--color-on-bg)] font-mono bg-[var(--color-surface-high)] px-2 py-0.5 rounded mr-2">{boxes.length}</span> 
            Fields Drawn
          </div>
          <Button variant="primary" onClick={handleSubmit} isLoading={submitting} className="h-9">
            <Save size={16} className="mr-2" />
            Submit for Approval
          </Button>
        </div>
      </div>

      {/* Main 3-Panel Content */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Panel: Thumbnails */}
        <div className="w-48 bg-[var(--color-surface-low)] border-r border-[var(--color-ghost-border)] flex flex-col hide-scrollbar overflow-y-auto p-4 hidden md:flex">
          <div className="text-xs font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-4">Pages</div>
          <div className="border-2 border-[var(--color-primary)] bg-[var(--color-surface-highest)] rounded p-1 mb-3 cursor-pointer relative group">
            <div className="aspect-[1/1.414] bg-white/5 rounded-sm flex items-center justify-center relative overflow-hidden">
              <LayoutPanelLeft size={24} className="text-[var(--color-primary)]/40" />
            </div>
            <div className="absolute bottom-2 right-2 bg-[var(--color-primary)] text-[var(--color-on-bg)] text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">1</div>
          </div>
          <button className="h-10 border border-dashed border-[var(--color-ghost-border)] rounded text-xs text-[var(--color-on-surface-variant)] flex items-center justify-center hover:text-[var(--color-on-bg)] transition-colors hover:bg-white/5">
            <Plus size={14} className="mr-1" /> Add Page
          </button>
        </div>

        {/* Center Panel: Interactive Canvas */}
        <div className="flex-1 bg-[var(--color-surface-lowest)] relative overflow-hidden flex items-center justify-center p-8">
          {/* Subtle instruction toast inside canvas */}
          {boxes.length === 0 && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-[var(--color-surface)] border border-[var(--color-ghost-border)] px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-10 animate-bounce-subtle">
              <Crosshair size={16} className="text-[var(--color-primary)]" />
              <span className="text-sm font-medium text-[var(--color-on-bg)]">Click and drag on the document to draw extraction fields</span>
            </div>
          )}

          {/* The Canvas */}
          <div 
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing}
            className="w-full max-w-3xl aspect-[1/1.414] bg-[#F5F5F5] rounded shadow-2xl relative cursor-crosshair border border-white/10"
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M90 10 L10 10 L10 100 M90 10 L90 50 M10 50 L90 50 M10 90 L90 90 M20 20 L40 20 M20 30 L60 30\' stroke=\'%23D0D0D0\' stroke-width=\'2\' fill=\'none\' stroke-linecap=\'round\'/%3E%3C/svg%3E")',
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {/* Dark mode filter overlay over the "white" document for aesthetics */}
            <div className="absolute inset-0 bg-[#0A1014]/60 mix-blend-multiply pointer-events-none"></div>

            {/* Render Drawn Boxes */}
            <AnimatePresence>
              {boxes.map(box => (
                <motion.div
                  key={box.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveBoxId(box.id);
                  }}
                  className={`absolute border-2 rounded-sm cursor-pointer transition-colors ${
                    activeBoxId === box.id 
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/20 shadow-[0_0_15px_var(--color-primary-bg)] z-20' 
                      : 'border-[var(--color-warning)] bg-[var(--color-warning)]/10 hover:border-[var(--color-primary)]/50 z-10'
                  }`}
                  style={{
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.width}%`,
                    height: `${box.height}%`,
                  }}
                >
                  {/* Field Label Badge on Canvas */}
                  {activeBoxId === box.id && (
                    <div className="absolute -top-6 left-0 bg-[var(--color-primary)] text-[var(--color-surface)] text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap shadow-md">
                      {box.fieldName}
                    </div>
                  )}
                  {/* Resize Handles (Visual Only) */}
                  {activeBoxId === box.id && (
                    <>
                      <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-[var(--color-primary)]"></div>
                      <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-[var(--color-primary)]"></div>
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Render Current Box while drawing */}
            {currentBox && (
              <div 
                className="absolute border border-dashed border-[var(--color-primary)] bg-[var(--color-primary)]/10 z-30"
                style={{
                  left: `${currentBox.x}%`,
                  top: `${currentBox.y}%`,
                  width: `${currentBox.w}%`,
                  height: `${currentBox.h}%`,
                }}
              />
            )}
          </div>
        </div>

        {/* Right Panel: Schema Builder */}
        <div className="w-80 bg-[var(--color-surface-low)] border-l border-[var(--color-ghost-border)] flex flex-col p-5 overflow-y-auto">
          <div className="mb-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-1.5">Template Name</label>
              <input 
                type="text" 
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder="e.g. Birth Registration"
                className="w-full h-10 px-3 rounded text-sm bg-[var(--color-surface-highest)] border border-[var(--color-ghost-border)] text-[var(--color-on-bg)] focus:border-[var(--color-primary)] outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-1.5">Department</label>
              <select 
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full h-10 px-3 rounded text-sm bg-[var(--color-surface-highest)] border border-[var(--color-ghost-border)] text-[var(--color-on-bg)] focus:border-[var(--color-primary)] outline-none appearance-none"
              >
                <option value="Revenue">Revenue</option>
                <option value="Health">Health</option>
                <option value="Transport">Transport</option>
                <option value="Police">Police</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--color-ghost-border)]">
            <h3 className="text-sm font-bold text-[var(--color-on-bg)] flex items-center gap-2">
              <List size={16} className="text-[var(--color-primary)]" /> Field Schema
            </h3>
            <span className="text-[10px] font-mono text-[var(--color-on-surface-variant)] bg-[var(--color-surface-highest)] px-1.5 py-0.5 rounded">
              {boxes.length} RULES
            </span>
          </div>

          {boxes.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-full bg-[var(--color-surface-highest)] flex items-center justify-center text-[var(--color-on-surface-variant)] mb-3">
                <Crosshair size={20} />
              </div>
              <p className="text-sm text-[var(--color-on-surface-variant)]">Draw a box on the document to add a new mapped field.</p>
            </div>
          ) : (
            <div className="space-y-3 pb-8">
              <AnimatePresence>
                {boxes.map((box, index) => (
                  <motion.div 
                    key={box.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`rounded overflow-hidden transition-all ${
                      activeBoxId === box.id 
                        ? 'border border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-md' 
                        : 'border border-[var(--color-ghost-border)] bg-[var(--color-surface-highest)] hover:border-[var(--color-on-surface-variant)]/50'
                    }`}
                    onClick={() => setActiveBoxId(box.id)}
                  >
                    <div className="p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[var(--color-surface-low)] flex items-center justify-center text-[10px] font-mono text-[var(--color-primary)]">
                            {index + 1}
                          </span>
                          <input 
                            type="text"
                            value={box.fieldName}
                            onChange={(e) => updateBox(box.id, { fieldName: e.target.value })}
                            className="bg-transparent text-sm font-bold text-[var(--color-on-bg)] outline-none w-32 border-b border-transparent focus:border-[var(--color-primary)] transition-colors placeholder-[var(--color-on-surface-variant)]"
                            placeholder="Field Name"
                          />
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteBox(box.id); }}
                          className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-error)] transition-colors p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {activeBoxId === box.id && (
                        <div className="pt-2 border-t border-[var(--color-ghost-border)] flex items-center gap-2">
                          <span className="text-xs text-[var(--color-on-surface-variant)]">Type:</span>
                          <div className="flex-1 grid grid-cols-2 gap-1.5">
                            {(['text', 'number', 'date', 'signature'] as FieldType[]).map(type => (
                              <button
                                key={type}
                                onClick={() => updateBox(box.id, { fieldType: type })}
                                className={`flex items-center justify-center gap-1.5 text-[10px] uppercase font-bold py-1.5 rounded transition-colors ${
                                  box.fieldType === type 
                                    ? 'bg-[var(--color-primary)] text-[var(--color-surface-lowest)]' 
                                    : 'bg-[var(--color-surface)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-bg)]'
                                }`}
                              >
                                {getIconForType(type)} {type}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
