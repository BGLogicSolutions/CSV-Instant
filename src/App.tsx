/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { parse, unparse, type ParseResult } from 'papaparse';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileUp, 
  Files, 
  Trash2, 
  Download, 
  FileText, 
  AlertCircle,
  CheckCircle2,
  Settings2,
  X,
  Eye,
  Table as TableIcon
} from 'lucide-react';

interface FileItem {
  id: string;
  file: File;
  rowCount: number | null;
  status: 'pending' | 'success' | 'error';
}

interface MergedResult {
  data: any[];
  headers: string[];
}

export default function App() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mergedResult, setMergedResult] = useState<MergedResult | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        rowCount: null,
        status: 'pending' as const
      }));
      setFiles(prev => [...prev, ...newFiles]);
      setMergedResult(null); // Reset preview on new upload
      setShowViewer(false);
      
      // Process row counts
      newFiles.forEach(fileItem => {
        // @ts-ignore - papa-parse overload issue in this environment
        parse(fileItem.file, {
          header: true,
          complete: (results: ParseResult<any>) => {
            setFiles(currentFiles => 
              currentFiles.map(f => f.id === fileItem.id ? { ...f, rowCount: results.data.length, status: 'success' } : f)
            );
          },
          error: () => {
            setFiles(currentFiles => 
              currentFiles.map(f => f.id === fileItem.id ? { ...f, status: 'error' } : f)
            );
          }
        });
      });
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setMergedResult(null);
    setShowViewer(false);
  };

  const handleMerge = async () => {
    if (files.length === 0) {
      setError("Por favor, selecciona al menos un archivo CSV.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const allData: any[] = [];
      const allHeaders = new Set<string>();

      for (const fileItem of files) {
        await new Promise<void>((resolve, reject) => {
          // @ts-ignore - papa-parse overload issue in this environment
          parse(fileItem.file, {
            header: true,
            skipEmptyLines: true,
            complete: (results: ParseResult<any>) => {
              if (results.meta.fields) {
                results.meta.fields.forEach(field => allHeaders.add(field));
              }
              allData.push(...results.data);
              resolve();
            },
            error: (err: any) => reject(err)
          });
        });
      }

      let finalData = allData;

      if (removeDuplicates) {
        const seen = new Set<string>();
        finalData = allData.filter(item => {
          const serialized = JSON.stringify(item);
          if (seen.has(serialized)) return false;
          seen.add(serialized);
          return true;
        });
      }

      const headers = Array.from(allHeaders);
      setMergedResult({ data: finalData, headers });
      setShowViewer(true);

      const csv = unparse({
        fields: headers,
        data: finalData
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `fusionado_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (err) {
      setError("Error al procesar los archivos. Asegúrate de que sean archivos CSV válidos.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-sans text-gray-300 p-6 lg:p-12 transition-colors duration-500">
      <div className={`${showViewer ? 'max-w-6xl' : 'max-w-3xl'} mx-auto transition-all duration-500`}>
        <header className="mb-12 text-center">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl shadow-sm mb-6 border border-white/10"
          >
            <Files className="w-8 h-8 text-white" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-light tracking-tight text-white mb-2"
          >
            CSV Fusion
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 text-lg max-w-md mx-auto"
          >
            Une y limpia tus archivos CSV de forma segura y sin perder datos.
          </motion.p>
        </header>

        <main className="space-y-8">
          {!showViewer ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
              {/* Upload Area */}
              <motion.div 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="relative"
              >
                <label 
                  htmlFor="csv-upload"
                  className="flex flex-col items-center justify-center w-full h-48 bg-white/5 backdrop-blur-md border-2 border-dashed border-white/10 rounded-3xl cursor-pointer hover:bg-white/10 transition-colors group"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FileUp className="w-10 h-10 text-gray-500 mb-4 group-hover:text-white transition-colors" />
                    <p className="mb-2 text-sm font-medium text-gray-300">
                      Haz clic para subir o arrastra tus archivos
                    </p>
                    <p className="text-xs text-gray-500">CSV (puedes seleccionar varios)</p>
                  </div>
                  <input 
                    id="csv-upload" 
                    type="file" 
                    multiple 
                    accept=".csv"
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                </label>
              </motion.div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto">
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Files List */}
              {files.length > 0 && (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-[#9E9E9E]">Archivos seleccionados</h3>
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-full font-medium">{files.length}</span>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                    <AnimatePresence initial={false}>
                      {files.map((fileItem) => (
                        <motion.div 
                          key={fileItem.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="p-4 flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-xl ${
                              fileItem.status === 'success' ? 'bg-green-50 text-green-600' : 
                              fileItem.status === 'error' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'
                            }`}>
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-black truncate max-w-[200px] md:max-w-xs">{fileItem.file.name}</p>
                              <p className="text-xs text-[#9E9E9E]">
                                {fileItem.rowCount !== null ? `${fileItem.rowCount.toLocaleString()} filas` : 'Calculando...'}
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={() => removeFile(fileItem.id)}
                            className="p-2 text-[#9E9E9E] hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Settings & Action */}
              <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-8 space-y-6">
                <div className="flex items-center gap-3 text-white">
                  <Settings2 className="w-5 h-5" />
                  <h3 className="font-medium">Opciones de fusión</h3>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="pr-4 text-left">
                    <p className="text-sm font-semibold text-white mb-1">Eliminar filas idénticas</p>
                    <p className="text-xs text-gray-500">Si se repite una fila completa exactamente igual, solo se conservará una copia.</p>
                  </div>
                  <button 
                    onClick={() => setRemoveDuplicates(!removeDuplicates)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${removeDuplicates ? 'bg-white' : 'bg-white/10'}`}
                  >
                    <span 
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${removeDuplicates ? 'translate-x-6 bg-black' : 'translate-x-1'}`} 
                    />
                  </button>
                </div>

                <button 
                  disabled={files.length === 0 || isProcessing}
                  onClick={handleMerge}
                  className={`w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 transition-all ${
                    files.length === 0 || isProcessing
                    ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                    : 'bg-white text-black hover:bg-gray-200 shadow-xl shadow-white/5'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>Unir y Descargar</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white text-black rounded-xl">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Vista Previa</h2>
                    <p className="text-sm text-gray-500">{mergedResult?.data.length.toLocaleString()} filas fusionadas</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowViewer(false)}
                    className="px-4 py-2 border border-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/5 transition-colors"
                  >
                    Volver a subir
                  </button>
                  <button 
                    onClick={handleMerge}
                    className="px-4 py-2 bg-white text-black rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Descargar de nuevo
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {mergedResult?.headers.map((header) => (
                          <th key={header} className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#9E9E9E] border-r border-gray-100 last:border-r-0 italic whitespace-nowrap">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {mergedResult?.data.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                          {mergedResult.headers.map((header) => (
                            <td key={header} className="px-6 py-4 text-xs font-mono text-[#4A4A4A] border-r border-gray-100 last:border-r-0 whitespace-nowrap">
                              {row[header]?.toString() || ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {mergedResult && mergedResult.data.length > 50 && (
                  <div className="p-6 bg-gray-50 text-center border-t border-gray-100">
                    <p className="text-xs text-[#9E9E9E] flex items-center justify-center gap-2">
                       Mostrando las primeras 50 filas. Descarga el archivo para ver el resultado completo ({mergedResult.data.length.toLocaleString()} filas).
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </main>

        <footer className="mt-12 text-center text-xs text-gray-500 space-y-4">
          <p>© {new Date().getFullYear()} CSV Fusion — Procesamiento local en tu navegador (tus datos nunca salen de aquí).</p>
          <div className="flex justify-center gap-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span>Privacidad garantizada</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span>Sin límite de tamaño</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
    }
