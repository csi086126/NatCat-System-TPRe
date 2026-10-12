//typescriptreact type="react" project="Flood Catastrophe Insurance System" file="disaster-map.tsx"
// 本页面职责:组合/账户层面的项目管理界面(老 Oasis 平台入口),含 Shapefile 上传、表单提交、
// 项目状态管理。**与 `oasislmf/page.tsx`(Oasis LMF 后端可视化)功能不同,二者并存,不要合并**。
//[v0-no-op-code-block-prefix]
"use client"

import { useState, useEffect, use,useRef } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '@/components/AppHeader'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Search, Upload, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Download } from 'lucide-react'
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import axios from 'axios'
import dynamic from 'next/dynamic'
import "leaflet/dist/leaflet.css"
import ProjectStatusCell from '../ProjectStatusCell'
import JSZip from 'jszip';
import shp from 'shpjs';

// import L from 'leaflet'

// 动态导入 MapContainer 组件，并禁用 SSR
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })


// Set up the default icon
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: '/images/marker-icon-2x.png',
//   iconUrl: '/images/marker-icon.png',
//   shadowUrl: '/images/marker-shadow.png',
// });

var tempuserName = "none";
var tempprojectName = "none";

export default function Component() {
  const router = useRouter()
  const [projectName, setProjectName] = useState("")
  const [userName, setUserName] = useState("")
  const [randomYears, setRandomYears] = useState("1")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [outputGranularity, setOutputGranularity] = useState("")
  const [annualTotalLoss, setAnnualTotalLoss] = useState("1")
  const [annualMaxLoss, setAnnualMaxLoss] = useState("0")
  const [lossPreciseEvent, setLossPreciseEvent] = useState("0")
  const [eventName, setEventName] = useState("")
  const [affectedArea, setAffectedArea] = useState("")
  const [date, setDate] = useState<Date>()
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [eventType, setEventType] = useState("")
  const [analysisMode, setAnalysisMode] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [currentTime, setCurrentTime] = useState(new Date())
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = 1
  const mapRef = useRef(null);
  const [L, setL] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  var file: File | undefined = undefined;
  interface Project {
    id: string;
    userName: string;
    startTime: string;
    endTime: string;
    years: number;
    annualTotalLoss: number;
    standDerivation: number;
    status: string;
  }
  
  const [projectData, setProjectData] = useState<Project[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    import('leaflet').then((leaflet) => {
      setL(leaflet);
    });
    import('proj4leaflet');

    // 页面加载时从后端获取表格数据
    axios.get('http://143.89.22.7:3001/api/projectData')
    .then(response => {
      setProjectData(response.data);
    })
    .catch(error => {
      console.error('Error fetching project data:', error);
    });

    return () => clearInterval(timer)
  }, [])

  const handleSubmit  = async () => {
    if (file ) {
      console.log(`File uploaded: ${file.name}`)
      // Here you would handle the file upload logic
      const formData = new FormData()
      formData.append('file', file)

      // alert('File uploaded successfully')
      
      try {
        const response = axios.post('http://143.89.22.7:3001/api/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        console.log('File uploaded successfully', response.data)
      } catch (error) {
        console.error('Error uploading file', error)
      }
    }




    //--user_name user1 --project_description "This is a demo project" --property_file input_table.csv --num_random_samples 10000
    const pycmd = '--project_id '+projectName+' --user_name '+userName+' --project_description demofile --property_file input_table.csv --num_random_samples '+randomYears.toString()
    // axios.post('http://localhost:3001/api/submit', { data: pycmd })

    projectData.push({
      id: projectName,
      userName: userName,
      startTime: startTime,
      endTime: endTime,
      years: Number(randomYears),
      annualTotalLoss: 0.0,
      standDerivation: 0.0,
      status: "Loading",
    })

    alert('Project submitted successfully. The backend is processing the results.')


    const response = await axios.post('http://143.89.22.7:3001/api/submit', { data: pycmd })
    .then(response => {
      console.log('Data submitted successfully', response.data)
    })
    .catch(error => {
      console.error('Error submitting data', error)
    })
    console.log("Form submitted", pycmd)
    



    const fetchData = async (userName: string, projectName: string) => {
      try {
        const response = await axios.get('http://143.89.22.7:3001/api/getresultdata', {
          params: {
            userName,
            projectName
          }
        });
        if (response.data) {
          console.log('Valid data received:', response.data);
          projectData[projectData.length - 1].annualTotalLoss = Number(response.data.annualTotalLoss);
          projectData[projectData.length - 1].standDerivation = Number(response.data.standDerivation);
          projectData[projectData.length - 1].status = "Completed";

          console.log('Project data:', projectData);

          // 将更新的数据发送到后端
          axios.post('http://143.89.22.7:3001/api/projectData', projectData)
          .then(response => {
            console.log('Project data updated:', response.data);
          })
          .catch(error => {
            console.error('Error updating project data:', error);
          });

          clearInterval(intervalId);
        } else {
          console.log('No valid data yet, retrying...');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    const intervalId = setInterval(() => fetchData(userName, projectName), 2000);
  }



  const handleCancel = () => {
    setProjectName("")
    setRandomYears("1")
    setStartTime("")
    setEndTime("")
    setOutputGranularity("")
    setAnnualTotalLoss("0")
    setAnnualMaxLoss("0")
    setLossPreciseEvent("0")
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    file = event.target.files?.[0]
    
  }

  const handleDownload = async (userName: string, projectName: string) => {
    try {
      console.log('Downloading project result:', tempuserName, tempprojectName)
      if (tempuserName === "none" || tempprojectName === "none") {
        alert('Please select a project to download.')
        return
      }
      const response = await axios.get('http://143.89.22.7:3001/api/download', {
        responseType: 'blob', // 确保响应类型为 blob
        params: {
          userName:tempuserName,
          projectName:tempprojectName
          }
      })

      // 创建一个 URL 对象并触发下载
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', tempuserName+tempprojectName+'.zip') // 设置下载文件名
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Error downloading file:', error)
    }
  }

  const transformCoordinates = (coordinates, transform) => {
    if (Array.isArray(coordinates[0])) {
      return coordinates.map(coord => transformCoordinates(coord, transform));
    } else {
      return transform.forward(coordinates);
    }
  };

  const handleRowClick = (project) => {
    setSelectedProjectId(project.id);

    tempuserName = project.userName;
    tempprojectName = project.id;
    if (!L) return;

    console.log('Row clicked:', project);
    if (mapRef.current) {
      const map = mapRef.current;
      map.eachLayer((layer) => {
        if (!(layer instanceof L.TileLayer)) map.removeLayer(layer);
      });

      if (project.status === "Completed") {
        // 加载并将shapefile添加到地图
        axios.get('http:///143.89.22.7:3001/api/download', {
          responseType: 'arraybuffer',
          params: {
            userName: tempuserName,
            projectName: tempprojectName
          }
        })
        .then(response => JSZip.loadAsync(response.data))
        .then(zip => {
          const shpFiles = [];
          zip.forEach((relativePath, file) => {
            if (relativePath.endsWith('.shp') || relativePath.endsWith('.shx') || relativePath.endsWith('.dbf')) {
              shpFiles.push({ name: relativePath, buffer: file.async('arraybuffer') });
            }
          });
          return Promise.all(shpFiles.map(file => file.buffer.then(buffer => ({ name: file.name, buffer }))));
        })
        .then(files => {
          return shp({
            shp: files.find(file => file.name.endsWith('.shp')).buffer,
            shx: files.find(file => file.name.endsWith('.shx')).buffer,
            dbf: files.find(file => file.name.endsWith('.dbf')).buffer
          });
        })
        .then(geojson => {
          if (geojson && geojson.features && geojson.features.length > 0) {
            console.log('Shapefile contains data:', geojson.features);

            const onEachFeature = (feature, layer) => {
              if (feature.properties) {
                layer.on('click', () => {
                  const popupContent = Object.entries(feature.properties)
                    .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
                    .join('<br />');
                  layer.bindPopup(popupContent).openPopup();
                });
              }
            };

            const shapefileLayer = L.geoJSON(geojson, {
              onEachFeature: onEachFeature
            });
            console.log('Shapefile layer:', shapefileLayer);
            shapefileLayer.addTo(map);

            // 调整地图视野范围以确保数据可见
            const bounds = shapefileLayer.getBounds();
            map.fitBounds(bounds);
            
          } else {
            console.log('Shapefile does not contain any data.');
          }
        })
        .catch(error => {
          console.error('Error loading shapefile:', error);
        });
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    router.push('/login');
  };

  return (
    <div className="flex flex-col h-screen">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/4 p-4 bg-gray-100 overflow-auto flex flex-col">
          <div className="space-y-4 flex-grow">
            <div className="space-y-2">
              <Label htmlFor="project-name">1. Project Name</Label>
              <Input id="project-name" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="random-years">2. Number of Random Years</Label>
              <Input id="random-years" type="number" value={randomYears} onChange={(e) => setRandomYears(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>3. Analysis Period</Label>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input 
                    id="start-time" 
                    type="date" 
                    value={startTime} 
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input 
                    id="end-time" 
                    type="date" 
                    value={endTime} 
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {/* <Label>4. Output Granularity</Label> */}
              {/* <Select onValueChange={setOutputGranularity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select granularity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select> */}
              <Label>4. User Name</Label>
              <Input id="project-name" value={userName} onChange={(e) => setUserName(e.target.value)} />

            </div>
            <div className="space-y-2">
              <Label>5. Results</Label>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Checkbox id="annualTotalLoss" checked={annualTotalLoss === "1"} onCheckedChange={(checked) => setAnnualTotalLoss(checked ? "1" : "0")} />
                  <label htmlFor="annualTotalLoss">Annual Total Loss</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="annualMaxLoss" checked={annualMaxLoss === "1"} onCheckedChange={(checked) => setAnnualMaxLoss(checked ? "1" : "0")} />
                  <label htmlFor="annualMaxLoss">Annual Maximum Loss</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="lossPreciseEvent" checked={lossPreciseEvent === "1"} onCheckedChange={(checked) => setLossPreciseEvent(checked ? "1" : "0")} />
                  <label htmlFor="lossPreciseEvent">Event Loss</label>
                </div>
              </div>
            </div>
            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-4">File Upload</h2>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="mb-2"
                placeholder="Choose file"
              />
              {/* <Button className="w-full">
                <Upload className="mr-2 h-4 w-4" /> Upload File
              </Button> */}
            </div>
            <div className="flex space-x-2 mt-4">
              {/* <Button variant="outline" onClick={handleCancel}>Cancel</Button> */}
              <Button onClick={handleSubmit}>Submit</Button>
            </div>

            {/* <Button onClick={() => handleDownload(userName, projectName)}>
              <Download className="mr-2 h-4 w-4" /> Download Project Result
            </Button> */}
          </div>

          <Separator className="my-6" />

        </div>
        <div className="w-3/4 p-4 space-y-8 overflow-auto">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Distribution of Insured Properties</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] w-full rounded-lg overflow-hidden">
                <MapContainer
                  ref={mapRef}
                  center={[22.3193, 114.1694]}
                  zoom={11}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  />
                  <Marker position={[22.3193, 114.1694]}>
                    <Popup>Central District - High Risk Zone</Popup>
                  </Marker>
                  <Marker position={[22.2783, 114.1747]}>
                    <Popup>Aberdeen - Flood Risk Area</Popup>
                  </Marker>
                  <Marker position={[22.3785, 114.2707]}>
                    <Popup>Sha Tin - Landslide Risk Zone</Popup>
                  </Marker>
                </MapContainer>
              </div>
            </CardContent>
          </Card>

          <Card>

          <div className="flex justify-between items-center px-4 py-2">
          <CardHeader >
            <CardTitle>Project List</CardTitle>
          </CardHeader>
          <Button onClick={() => handleDownload(userName, projectName)} className="flex items-center">
              <Download className="mr-2 h-4 w-4" /> Download Project Result
          </Button>
          </div>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Project ID</TableHead>
                    <TableHead className="text-xs">User Name</TableHead>
                    <TableHead className="text-xs">Start Time</TableHead>
                    <TableHead className="text-xs">End Time</TableHead>
                    <TableHead className="text-xs">No. of Years</TableHead>
                    <TableHead className="text-xs">Annual Total Loss</TableHead>
                    <TableHead className="text-xs">Standard Deviation</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectData.map((project) => (
                    <TableRow
                    key={project.id}
                    onClick={() => handleRowClick(project)}
                    style={{
                      backgroundColor: selectedProjectId === project.id ? 'lightblue' : 'transparent',
                    }}
                  >
                      <TableCell>{project.id}</TableCell>
                      <TableCell>{project.userName}</TableCell>
                      <TableCell>{project.startTime}</TableCell>
                      <TableCell>{project.endTime}</TableCell>
                      <TableCell>{project.years}</TableCell>
                      <TableCell>{(project.annualTotalLoss).toFixed(2)}</TableCell>
                      <TableCell>{(project.standDerivation).toFixed(2)}</TableCell>
                      <ProjectStatusCell project={project} />
                    </TableRow>
                  ))}
                  
                </TableBody>
              </Table>
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">Page {currentPage} of {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="text-right text-sm text-gray-500">
            {/* Current Time: {currentTime.toLocaleString()} */}
            Current Time: 
          </div>
        </div>
      </div>
    </div>
  )
}