import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Download, ArrowLeft, DollarSign, FileSpreadsheet, Sparkles } from 'lucide-react';

const FILE_PATH = '/downloads/DealWiseRent_Pro_Calculator.xlsx';
const FILE_NAME = 'DealWiseRent_Pro_Calculator.xlsx';

export default function DownloadSuccess() {
  const navigate = useNavigate();
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(FILE_PATH);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = FILE_NAME;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setDownloaded(true);
      } catch {
        setDownloaded(true); // still show the manual button
      }
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Header */}
      <header className="sticky top-0 z-40 w-full">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-b border-border/60" />
        <div className="relative max-w-7xl mx-auto px-4 md:px-6 flex items-center h-16">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 group">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm"
              style={{ background: 'linear-gradient(135deg, hsl(263 80% 58%), hsl(245 80% 60%))' }}
            >
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold tracking-tight text-foreground hidden sm:block">
              Deal Wise <span className="gradient-text">Rent</span>
            </span>
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md flex flex-col items-center gap-6">

          {/* Success icon */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center shadow-md">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          {/* Heading */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black text-foreground">Payment Successful!</h1>
            <p className="text-sm text-muted-foreground">
              Thank you for your purchase. Your file is{' '}
              <span className="text-green-500 font-semibold">
                {downloaded ? 'downloading now' : 'being prepared…'}
              </span>
            </p>
          </div>

          {/* File card */}
          <div className="w-full rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, hsl(142 70% 45%), hsl(160 70% 40%))' }} />
            <div className="px-5 py-4 flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, hsl(142 70% 45%), hsl(160 70% 40%))' }}
              >
                <FileSpreadsheet className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">Pro Calculator Spreadsheet</p>
                <p className="text-xs text-muted-foreground">DealWiseRent_Pro_Calculator.xlsx</p>
              </div>
              <button
                onClick={async () => {
                  const res = await fetch(FILE_PATH);
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = FILE_NAME;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white btn-gradient shadow-sm hover:shadow-md transition-all whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            </div>
          </div>

          {/* Info note */}
          <p className="text-xs text-muted-foreground text-center px-4">
            The download started automatically. If your browser blocked it, use the button above.
          </p>

          {/* Back link */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Deal Analyzer
          </button>

        </div>
      </main>
    </div>
  );
}
