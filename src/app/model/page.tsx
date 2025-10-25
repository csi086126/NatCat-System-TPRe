"use client";

import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Cpu, ExternalLink, CheckCircle2 } from 'lucide-react';

export default function Component() {
  const router = useRouter();
  
  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <AppHeader />
      
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-6xl w-full space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">
              Select Catastrophe Model
            </h1>
            <p className="text-gray-600 text-lg">
              Choose the modeling platform for catastrophe risk analysis
            </p>
          </div>
          
          {/* Model Cards Grid */}
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            
            {/* OasisLMF Card */}
            <Card className="border-2 border-blue-200 hover:border-blue-400 hover:shadow-xl transition-all duration-300 cursor-pointer group"
                  onClick={() => router.push('/oasislmf')}>
              <CardHeader className="bg-gradient-to-br from-blue-50 to-teal-50 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600 rounded-lg group-hover:bg-blue-700 transition-colors">
                      <Cpu className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-gray-800">OasisLMF</CardTitle>
                      <p className="text-xs text-teal-600 font-semibold mt-1">RECOMMENDED</p>
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <CardDescription className="text-sm text-gray-700 leading-relaxed">
                  Industry-standard open-source catastrophe modeling platform with professional-grade 
                  computational capabilities and comprehensive loss estimation framework.
                </CardDescription>
                
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Key Features:</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                      <span>Probabilistic event sets (10,000+ year catalogs)</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                      <span>Advanced vulnerability and damage functions</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                      <span>Financial loss & reinsurance modeling</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                      <span>API integration & workflow automation</span>
                    </li>
                  </ul>
                </div>
                
                <div className="pt-4 border-t">
                  <Button 
                    className="w-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-semibold"
                    onClick={() => router.push('/oasislmf')}
                  >
                    Launch OasisLMF
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs text-green-800">
                    <strong>Status:</strong> Installed on WSL Ubuntu
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Running at <span className="font-mono">http://localhost:8080/</span>
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* HKUST Model Card */}
            <Card className="border-2 border-slate-200 hover:border-slate-400 hover:shadow-xl transition-all duration-300 cursor-pointer group"
                  onClick={() => router.push('/oasis')}>
              <CardHeader className="bg-gradient-to-br from-slate-50 to-gray-50 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-600 rounded-lg group-hover:bg-slate-700 transition-colors">
                      <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-gray-800">HKUST Model</CardTitle>
                      <p className="text-xs text-slate-600 font-semibold mt-1">EDUCATIONAL</p>
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-slate-600 transition-colors" />
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <CardDescription className="text-sm text-gray-700 leading-relaxed">
                  Academic catastrophe model developed at Hong Kong University of Science and Technology, 
                  designed for research and educational purposes.
                </CardDescription>
                
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Key Features:</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                      <span>Project & portfolio management</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                      <span>Monte Carlo simulation engine</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                      <span>Interactive map-based analysis</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                      <span>Simplified loss calculation workflow</span>
                    </li>
                  </ul>
                </div>
                
                <div className="pt-4 border-t">
                  <Button 
                    className="w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold"
                    onClick={() => router.push('/oasis')}
                  >
                    Launch HKUST Model
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Status:</strong> Always available
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Also accessible via <strong>Extensions</strong> module
                  </p>
                </div>
              </CardContent>
            </Card>
            
          </div>
          
          {/* Bottom Info */}
          <div className="text-center pt-4">
            <p className="text-sm text-gray-500">
              💡 <strong>Tip:</strong> Start with OasisLMF for production-grade analysis, or use HKUST Model for quick prototyping
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
}