"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '@/components/AppHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InfoIcon, AlertCircle, ExternalLink, Activity, RefreshCw } from 'lucide-react'
import { Separator } from "@/components/ui/separator"

export default function OasisLMFPage() {
  const router = useRouter()
  const [oasisUrl, setOasisUrl] = useState<string>('')
  const [isOasisRunning, setIsOasisRunning] = useState<boolean>(false)
  const [checkingStatus, setCheckingStatus] = useState<boolean>(false)
  const [useProxy, setUseProxy] = useState<boolean>(false) // Use direct connection by default (theme already applied in Docker)

  // Check if OasisLMF is running
  const checkOasisStatus = async () => {
    setCheckingStatus(true)
    try {
      // Get the current host (either localhost or the actual IP address like 10.253.22.15)
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
      
      // Try common OasisLMF ports (8088 is the current OasisUI port)
      const ports = [8088, 8080, 8000, 8888, 3000]
      for (const port of ports) {
        try {
          const response = await fetch(`http://${currentHost}:${port}`, { 
            mode: 'no-cors'
          })
          // If we get here without error, the port is accessible
          setOasisUrl(`http://${currentHost}:${port}`)
          setIsOasisRunning(true)
          setCheckingStatus(false)
          return
        } catch (e) {
          continue
        }
      }
      setIsOasisRunning(false)
    } catch (error) {
      console.error('Error checking Oasis status:', error)
      setIsOasisRunning(false)
    }
    setCheckingStatus(false)
  }

  useEffect(() => {
    checkOasisStatus()
  }, [])

  // Get the iframe URL (either direct or through proxy with Taiping theme)
  const getIframeUrl = () => {
    if (!isOasisRunning || !oasisUrl) return ''
    
    if (useProxy) {
      // Use Next.js API proxy to inject Taiping blue-teal theme
      return '/api/oasis-proxy?path=/'
    } else {
      // Direct access with original OasisUI red theme
      return oasisUrl
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <AppHeader />
      
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar - Configuration Panel */}
        <aside className="w-80 flex-shrink-0 border-r bg-white p-6 overflow-y-auto space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">OasisLMF Platform</h2>
            <p className="text-sm text-gray-600">Open-source catastrophe modeling framework</p>
          </div>
          
          <Separator />
          
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-5 h-5" />
                Service Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">OasisLMF:</span>
                <span className={`text-sm font-semibold ${isOasisRunning ? 'text-green-600' : 'text-red-600'}`}>
                  {isOasisRunning ? '● Running' : '● Not Running'}
                </span>
              </div>
              
              {isOasisRunning && oasisUrl && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">URL:</span>
                  <span className="text-xs font-mono text-blue-600">{oasisUrl}</span>
                </div>
              )}
              
              <Button 
                onClick={checkOasisStatus}
                disabled={checkingStatus}
                className="w-full"
                variant="outline"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${checkingStatus ? 'animate-spin' : ''}`} />
                {checkingStatus ? 'Checking...' : 'Refresh Status'}
              </Button>
            </CardContent>
          </Card>
          
          {/* Quick Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                className="w-full"
                onClick={() => router.push('/oasis')}
                variant="outline"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View HKUST Model
              </Button>
              
              {isOasisRunning && oasisUrl && (
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => window.open(oasisUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open OasisLMF UI
                </Button>
              )}
            </CardContent>
          </Card>
          
          {/* Information Card */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-blue-800">
                <InfoIcon className="w-5 h-5" />
                About OasisLMF
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-700 space-y-2">
              <p>
                OasisLMF is an open-source catastrophe modeling platform maintained by Oasis LMF Ltd, 
                providing industry-standard loss estimation capabilities.
              </p>
              <p className="text-xs text-gray-600 mt-2">
                <strong>Key Capabilities:</strong>
              </p>
              <ul className="text-xs list-disc list-inside text-gray-600 space-y-1">
                <li>Probabilistic event sets (10k+ years)</li>
                <li>Exposure data management</li>
                <li>Vulnerability & damage functions</li>
                <li>Financial loss calculations</li>
                <li>Reinsurance contract modeling</li>
                <li>Results aggregation & analytics</li>
              </ul>
            </CardContent>
          </Card>
          
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          
          {isOasisRunning && oasisUrl ? (
            // OasisLMF iframe when service is running
            <div className="flex-1 relative bg-white">
              <iframe
                src={getIframeUrl()}
                title="OasisLMF Platform"
                className="w-full h-full border-0"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation allow-storage-access-by-user-activation"
                allow="fullscreen"
                key={useProxy ? 'with-taiping-theme' : 'original-theme'} // Force reload when theme changes
              ></iframe>
            </div>
          ) : (
            // Setup instructions when service is not running
            <div className="flex-1 overflow-auto p-8">
              <div className="max-w-4xl mx-auto space-y-6">
                
                <Alert variant="destructive">
                  <AlertCircle className="h-5 w-5" />
                  <AlertTitle className="text-lg">OasisLMF Service Not Running</AlertTitle>
                  <AlertDescription className="text-sm mt-2">
                    The OasisLMF platform is not currently accessible. Please follow the setup instructions below to start the service.
                  </AlertDescription>
                </Alert>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Setup Instructions</CardTitle>
                    <CardDescription>Follow these steps to start OasisLMF on WSL Ubuntu</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    
                    <div className="space-y-2">
                      <h3 className="font-semibold text-base flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm">1</span>
                        Open WSL Ubuntu Terminal
                      </h3>
                      <div className="ml-8 p-3 bg-gray-100 rounded font-mono text-sm">
                        wsl
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-semibold text-base flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm">2</span>
                        Navigate to OasisLMF Directory
                      </h3>
                      <div className="ml-8 p-3 bg-gray-100 rounded font-mono text-sm">
                        cd /mnt/d/web-flood-insurance-model/OasisEvaluation
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-semibold text-base flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm">3</span>
                        Start Docker Services
                      </h3>
                      <div className="ml-8 p-3 bg-gray-100 rounded font-mono text-sm">
                        docker-compose up -d
                      </div>
                      <p className="ml-8 text-sm text-gray-600">
                        This will start all OasisLMF services in the background.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-semibold text-base flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm">4</span>
                        Verify Services are Running
                      </h3>
                      <div className="ml-8 p-3 bg-gray-100 rounded font-mono text-sm">
                        docker-compose ps
                      </div>
                      <p className="ml-8 text-sm text-gray-600">
                        All services should show status "Up". The web UI is typically available at:
                      </p>
                      <ul className="ml-12 text-sm text-gray-600 list-disc">
                        <li>http://localhost:8088 (OasisUI - current)</li>
                        <li>http://localhost:8080 (GeoServer)</li>
                        <li>http://localhost:8000 (OasisLMF API)</li>
                        <li>Check your docker-compose.yml for other ports</li>
                      </ul>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-semibold text-base flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm">5</span>
                        Refresh This Page
                      </h3>
                      <div className="ml-8">
                        <Button onClick={checkOasisStatus} className="bg-blue-600 hover:bg-blue-700">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Check Status Again
                        </Button>
                      </div>
                    </div>
                    
                  </CardContent>
                </Card>
                
                <Card className="border-yellow-300 bg-yellow-50">
                  <CardHeader>
                    <CardTitle className="text-base text-yellow-800">📌 Important Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-700 space-y-2">
                    <p>
                      <strong>Prerequisites:</strong>
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>WSL Ubuntu must be installed and running</li>
                      <li>Docker Desktop must be running with WSL integration enabled</li>
                      <li>OasisLMF must be downloaded to: <code className="text-xs bg-white px-1 py-0.5 rounded">D:\web-flood-insurance-model\OasisEvaluation</code></li>
                    </ul>
                    
                    <p className="mt-4">
                      <strong>Troubleshooting:</strong>
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>If services fail to start, check Docker Desktop is running</li>
                      <li>Check logs with: <code className="text-xs bg-white px-1 py-0.5 rounded">docker-compose logs</code></li>
                      <li>Stop services with: <code className="text-xs bg-white px-1 py-0.5 rounded">docker-compose down</code></li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-base text-blue-800">🎓 Alternative: HKUST Model</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 mb-3">
                      While setting up OasisLMF, you can use the HKUST Catastrophe Model developed at Hong Kong University of Science and Technology.
                    </p>
                    <Button 
                      onClick={() => router.push('/oasis')}
                      variant="outline"
                      className="border-blue-300"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Go to HKUST Model
                    </Button>
                  </CardContent>
                </Card>
                
              </div>
            </div>
          )}
          
        </main>
        
      </div>
    </div>
  )
}
