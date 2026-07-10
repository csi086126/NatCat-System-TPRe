# GeoServer Layer Configuration Examples

## 真实数据配置示例

以下是实际配置 GeoServer 图层的示例，展示如何将你的 TIFF 和 Shapefile 数据接入系统。

## 示例 1: 台风山竹洪水深度数据 (TIFF)

### GeoServer 配置步骤

1. **准备数据文件**
   ```
   文件名: typhoon_mangkhut_flood_depth.tif
   坐标系: EPSG:4326 (WGS84)
   数据类型: Float32 (洪水深度，单位：米)
   ```

2. **在 GeoServer 中发布**
   - 工作空间: `historical_events`
   - 数据存储名称: `mangkhut_flood_store`
   - 图层名称: `typhoon_mangkhut_flood_depth`
   - 完整图层名: `historical_events:typhoon_mangkhut_flood_depth`

3. **配置样式 (SLD)**
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <StyledLayerDescriptor version="1.0.0">
     <NamedLayer>
       <Name>flood_depth</Name>
       <UserStyle>
         <FeatureTypeStyle>
           <Rule>
             <RasterSymbolizer>
               <ColorMap type="ramp">
                 <ColorMapEntry color="#FFFFFF" quantity="0" opacity="0"/>
                 <ColorMapEntry color="#CCFFFF" quantity="0.5" label="0.5m"/>
                 <ColorMapEntry color="#00CCFF" quantity="1.0" label="1.0m"/>
                 <ColorMapEntry color="#0099FF" quantity="2.0" label="2.0m"/>
                 <ColorMapEntry color="#0066FF" quantity="3.0" label="3.0m"/>
                 <ColorMapEntry color="#0000FF" quantity="5.0" label="5.0m"/>
                 <ColorMapEntry color="#000099" quantity="10.0" label=">10m"/>
               </ColorMap>
             </RasterSymbolizer>
           </Rule>
         </FeatureTypeStyle>
       </UserStyle>
     </NamedLayer>
   </StyledLayerDescriptor>
   ```

4. **在 JSON 中配置**
   ```json
   {
     "id": "mangkhut_flood_depth",
     "name": "Flood Depth - Typhoon Mangkhut",
     "workspace": "historical_events",
     "layerName": "typhoon_mangkhut_flood_depth",
     "type": "raster",
     "format": "image/png",
     "description": "Simulated flood depth during Typhoon Mangkhut, ranging from 0 to 10+ meters"
   }
   ```

## 示例 2: 受影响区域边界 (Shapefile)

### GeoServer 配置步骤

1. **准备数据文件**
   ```
   文件: mangkhut_affected_areas.shp (+ .dbf, .shx, .prj)
   坐标系: EPSG:4326
   几何类型: Polygon
   属性字段:
     - area_name (String)
     - damage_level (String: Low/Medium/High/Severe)
     - population (Integer)
   ```

2. **在 GeoServer 中发布**
   - 工作空间: `historical_events`
   - 数据存储名称: `mangkhut_vector_store`
   - 图层名称: `typhoon_mangkhut_affected_areas`
   - 完整图层名: `historical_events:typhoon_mangkhut_affected_areas`

3. **配置样式 (SLD)**
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <StyledLayerDescriptor version="1.0.0">
     <NamedLayer>
       <Name>affected_areas</Name>
       <UserStyle>
         <FeatureTypeStyle>
           <!-- Low Damage -->
           <Rule>
             <Name>Low</Name>
             <ogc:Filter>
               <ogc:PropertyIsEqualTo>
                 <ogc:PropertyName>damage_level</ogc:PropertyName>
                 <ogc:Literal>Low</ogc:Literal>
               </ogc:PropertyIsEqualTo>
             </ogc:Filter>
             <PolygonSymbolizer>
               <Fill>
                 <CssParameter name="fill">#FFFF99</CssParameter>
                 <CssParameter name="fill-opacity">0.5</CssParameter>
               </Fill>
               <Stroke>
                 <CssParameter name="stroke">#FFCC00</CssParameter>
                 <CssParameter name="stroke-width">2</CssParameter>
               </Stroke>
             </PolygonSymbolizer>
           </Rule>
           <!-- Medium Damage -->
           <Rule>
             <Name>Medium</Name>
             <ogc:Filter>
               <ogc:PropertyIsEqualTo>
                 <ogc:PropertyName>damage_level</ogc:PropertyName>
                 <ogc:Literal>Medium</ogc:Literal>
               </ogc:PropertyIsEqualTo>
             </ogc:Filter>
             <PolygonSymbolizer>
               <Fill>
                 <CssParameter name="fill">#FF9966</CssParameter>
                 <CssParameter name="fill-opacity">0.6</CssParameter>
               </Fill>
               <Stroke>
                 <CssParameter name="stroke">#FF6600</CssParameter>
                 <CssParameter name="stroke-width">2</CssParameter>
               </Stroke>
             </PolygonSymbolizer>
           </Rule>
           <!-- High Damage -->
           <Rule>
             <Name>High</Name>
             <ogc:Filter>
               <ogc:PropertyIsEqualTo>
                 <ogc:PropertyName>damage_level</ogc:PropertyName>
                 <ogc:Literal>High</ogc:Literal>
               </ogc:PropertyIsEqualTo>
             </ogc:Filter>
             <PolygonSymbolizer>
               <Fill>
                 <CssParameter name="fill">#FF6666</CssParameter>
                 <CssParameter name="fill-opacity">0.7</CssParameter>
               </Fill>
               <Stroke>
                 <CssParameter name="stroke">#CC0000</CssParameter>
                 <CssParameter name="stroke-width">2</CssParameter>
               </Stroke>
             </PolygonSymbolizer>
           </Rule>
         </FeatureTypeStyle>
       </UserStyle>
     </NamedLayer>
   </StyledLayerDescriptor>
   ```

4. **在 JSON 中配置**
   ```json
   {
     "id": "mangkhut_affected_areas",
     "name": "Affected Areas - Typhoon Mangkhut",
     "workspace": "historical_events",
     "layerName": "typhoon_mangkhut_affected_areas",
     "type": "vector",
     "format": "image/png",
     "description": "Polygon showing affected areas with damage level classification"
   }
   ```

## 示例 3: 风场数据 (TIFF)

### GeoServer 配置

1. **数据文件**
   ```
   文件名: typhoon_mangkhut_wind_speed.tif
   坐标系: EPSG:4326
   数据类型: Float32 (风速，单位：km/h)
   NoData值: -9999
   ```

2. **GeoServer 发布**
   ```
   工作空间: historical_events
   图层名称: typhoon_mangkhut_wind_field
   完整名称: historical_events:typhoon_mangkhut_wind_field
   ```

3. **风速颜色映射 (SLD)**
   ```xml
   <ColorMap type="ramp">
     <ColorMapEntry color="#FFFFFF" quantity="0" opacity="0" label="Calm"/>
     <ColorMapEntry color="#00FF00" quantity="50" label="50 km/h"/>
     <ColorMapEntry color="#FFFF00" quantity="100" label="100 km/h"/>
     <ColorMapEntry color="#FFA500" quantity="150" label="150 km/h"/>
     <ColorMapEntry color="#FF0000" quantity="200" label="200 km/h"/>
     <ColorMapEntry color="#8B0000" quantity="250" label="250+ km/h"/>
   </ColorMap>
   ```

4. **JSON 配置**
   ```json
   {
     "id": "mangkhut_wind_field",
     "name": "Wind Field - Typhoon Mangkhut",
     "workspace": "historical_events",
     "layerName": "typhoon_mangkhut_wind_field",
     "type": "raster",
     "format": "image/png",
     "description": "Maximum wind speed distribution during Typhoon Mangkhut (km/h)"
   }
   ```

## 完整事件配置示例

将以上三个图层组合成一个完整的历史事件：

```json
{
  "id": "TY2023-001",
  "name": "Typhoon Mangkhut",
  "type": "Typhoon",
  "date": "2023-09-16",
  "year": 2023,
  "region": "Hong Kong",
  "maxWindSpeed": "285 km/h",
  "totalRainfall": "350 mm",
  "estimatedLoss": "$6.27 Billion",
  "affectedPopulation": "3.6 Million",
  "affectedAreas": ["Hong Kong", "Guangdong", "Macau"],
  "geometry": {
    "type": "Point",
    "coordinates": [114.1694, 22.3193]
  },
  "geoserverLayers": [
    {
      "id": "mangkhut_flood_depth",
      "name": "Flood Depth - Typhoon Mangkhut",
      "workspace": "historical_events",
      "layerName": "typhoon_mangkhut_flood_depth",
      "type": "raster",
      "format": "image/png",
      "description": "Simulated flood depth during Typhoon Mangkhut, ranging from 0 to 10+ meters"
    },
    {
      "id": "mangkhut_wind_field",
      "name": "Wind Field - Typhoon Mangkhut",
      "workspace": "historical_events",
      "layerName": "typhoon_mangkhut_wind_field",
      "type": "raster",
      "format": "image/png",
      "description": "Maximum wind speed distribution during Typhoon Mangkhut (km/h)"
    },
    {
      "id": "mangkhut_affected_areas",
      "name": "Affected Areas - Typhoon Mangkhut",
      "workspace": "historical_events",
      "layerName": "typhoon_mangkhut_affected_areas",
      "type": "vector",
      "format": "image/png",
      "description": "Polygon showing affected areas with damage level classification"
    }
  ]
}
```

## 数据准备工具

### 转换坐标系 (使用 GDAL)

```bash
# 将 TIFF 转换为 EPSG:4326
gdalwarp -t_srs EPSG:4326 -tr 0.001 0.001 -r bilinear \
  input.tif output_4326.tif

# 压缩 TIFF 以减小文件大小
gdal_translate -co "COMPRESS=LZW" -co "TILED=YES" \
  input.tif output_compressed.tif

# 创建金字塔以提高性能
gdaladdo -r average output.tif 2 4 8 16
```

### 转换 Shapefile 坐标系

```bash
# 使用 ogr2ogr 转换
ogr2ogr -t_srs EPSG:4326 output.shp input.shp

# 简化几何以提高性能
ogr2ogr -simplify 0.0001 output_simplified.shp input.shp
```

## 测试 WMS 请求

### GetCapabilities 请求
```
http://143.89.22.7:8090/geoserver/wms?
  service=WMS&
  version=1.1.0&
  request=GetCapabilities
```

### GetMap 请求示例
```
http://143.89.22.7:8090/geoserver/wms?
  service=WMS&
  version=1.1.0&
  request=GetMap&
  layers=historical_events:typhoon_mangkhut_flood_depth&
  styles=&
  bbox=113.8,22.1,114.5,22.6&
  width=768&
  height=576&
  srs=EPSG:4326&
  format=image/png&
  transparent=true
```

### GetFeatureInfo 请求 (查询矢量要素)
```
http://143.89.22.7:8090/geoserver/wms?
  service=WMS&
  version=1.1.0&
  request=GetFeatureInfo&
  layers=historical_events:typhoon_mangkhut_affected_areas&
  query_layers=historical_events:typhoon_mangkhut_affected_areas&
  bbox=113.8,22.1,114.5,22.6&
  width=768&
  height=576&
  srs=EPSG:4326&
  format=image/png&
  info_format=application/json&
  x=384&
  y=288&
  transparent=true
```

## 性能优化建议

### 1. TIFF 文件优化
```bash
# 创建优化的 COG (Cloud Optimized GeoTIFF)
gdal_translate input.tif output.tif \
  -co TILED=YES \
  -co COPY_SRC_OVERVIEWS=YES \
  -co COMPRESS=DEFLATE \
  -co PREDICTOR=2
```

### 2. GeoWebCache 配置
在 GeoServer 中为频繁访问的图层启用缓存：
- Tile Caching → Tile Layers
- 选择图层并启用缓存
- 配置缓存网格集 (EPSG:4326, EPSG:3857)

### 3. SLD 样式优化
- 使用简单的颜色映射
- 避免过多的规则
- 对矢量数据使用适当的简化级别

## 故障排除

### 图层不显示
1. 检查 GeoServer 图层预览是否正常
2. 验证坐标系是否正确
3. 确认图层名称大小写一致
4. 检查浏览器控制台的 CORS 错误

### 图层加载缓慢
1. 优化 TIFF 文件大小
2. 启用 GeoWebCache
3. 创建图像金字塔
4. 使用适当的压缩格式

### 样式不正确
1. 在 GeoServer 中预览图层
2. 验证 SLD 语法
3. 检查数据值范围
4. 确认 ColorMap 量值正确

## 下一步

将这些示例应用到你自己的数据：

1. 准备你的 TIFF/Shapefile 文件
2. 在 GeoServer 中发布图层
3. 配置适当的样式
4. 更新 JSON 配置文件
5. 在平台中测试显示

祝你配置顺利！🎉
