'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Download, Upload, FileText, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import StructuredData from './structured-data';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onDrop = (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setSuccess(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
    },
    multiple: false,
  });

  const handleConvert = async () => {
    if (!file) return;

    setConverting(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Conversion failed');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error('Conversion failed');
      }

      // Convert base64 to blob and download
      const binaryString = atob(result.pdf);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during conversion');
    } finally {
      setConverting(false);
    }
  };

  const resetFile = () => {
    setFile(null);
    setError(null);
    setSuccess(false);
  };

  return (
    <>
      <StructuredData />
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            Word to <span className="text-blue-600">PDF</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Convert your Word documents to PDF format instantly. Fast, secure, and completely free.
          </p>
        </div>

        {/* Main Card */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-6 md:p-8">
              {/* Step Indicator */}
              <div className="flex items-center justify-center mb-8">
                <div className="flex items-center space-x-4">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${file ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'} text-sm font-medium`}>
                    1
                  </div>
                  <div className="w-12 h-0.5 bg-gray-200"></div>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${success ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'} text-sm font-medium`}>
                    2
                  </div>
                </div>
              </div>

              {/* Upload Area */}
              {!file ? (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 md:p-12 text-center cursor-pointer transition-all duration-200 ${
                    isDragActive
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="mx-auto w-12 h-12 text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    {isDragActive ? 'Drop your file here' : 'Choose or drag your Word document'}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Supports .doc and .docx files up to 10MB
                  </p>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                    Select File
                  </button>
                </div>
              ) : (
                <>
                  {/* File Info */}
                  <div className="bg-gray-50 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-8 h-8 text-blue-600" />
                        <div>
                          <h3 className="font-semibold text-gray-900">{file.name}</h3>
                          <p className="text-sm text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={resetFile}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={converting}
                      >
                        <ArrowRight className="w-5 h-5 transform rotate-45" />
                      </button>
                    </div>
                  </div>

                  {/* Convert Button */}
                  <div className="flex justify-center mb-6">
                    <button
                      onClick={handleConvert}
                      disabled={converting || success}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center space-x-3 min-w-48"
                    >
                      {converting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Converting...</span>
                        </>
                      ) : success ? (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          <span>Downloaded</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5" />
                          <span>Convert to PDF</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3 mb-4">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <p className="text-green-700">
                    Your PDF has been downloaded successfully!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Easy Upload</h3>
              <p className="text-gray-600">
                Simply drag and drop your Word document or click to select
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ArrowRight className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Fast Conversion</h3>
              <p className="text-gray-600">
                Convert your documents in seconds with our optimized engine
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Instant Download</h3>
              <p className="text-gray-600">
                Your converted PDF is ready for download immediately
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
    </>
  );
}
