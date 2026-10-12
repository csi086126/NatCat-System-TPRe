<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0"
  xmlns="http://www.opengis.net/sld"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <Name>HK Drainage Junctions</Name>
    <UserStyle>
      <Name>drainage_junctions</Name>
      <Title>HK Drainage Junctions (SWMM [JUNCTIONS])</Title>
      <Abstract>Junction manholes colored by invert elevation.</Abstract>
      <FeatureTypeStyle>
        <Rule>
          <Name>junction_deep</Name>
          <Title>Deep Junction (elev &lt; 0 m)</Title>
          <ogc:Filter>
            <ogc:PropertyIsLessThan><ogc:PropertyName>elev</ogc:PropertyName><ogc:Literal>0</ogc:Literal></ogc:PropertyIsLessThan>
          </ogc:Filter>
          <PointSymbolizer>
            <Graphic><Mark><WellKnownName>circle</WellKnownName>
              <Fill><CssParameter name="fill">#F97316</CssParameter><CssParameter name="fill-opacity">0.95</CssParameter></Fill>
              <Stroke><CssParameter name="stroke">#7C2D12</CssParameter><CssParameter name="stroke-width">0.8</CssParameter></Stroke>
            </Mark><Size>7</Size></Graphic>
          </PointSymbolizer>
        </Rule>
        <Rule>
          <Name>junction_low</Name>
          <Title>Junction, low elevation (0 - 10 m)</Title>
          <ogc:Filter>
            <ogc:PropertyIsBetween>
              <ogc:PropertyName>elev</ogc:PropertyName>
              <ogc:LowerBoundary><ogc:Literal>0</ogc:Literal></ogc:LowerBoundary>
              <ogc:UpperBoundary><ogc:Literal>10</ogc:Literal></ogc:UpperBoundary>
            </ogc:PropertyIsBetween>
          </ogc:Filter>
          <PointSymbolizer>
            <Graphic><Mark><WellKnownName>circle</WellKnownName>
              <Fill><CssParameter name="fill">#2563EB</CssParameter><CssParameter name="fill-opacity">0.9</CssParameter></Fill>
              <Stroke><CssParameter name="stroke">#1E3A8A</CssParameter><CssParameter name="stroke-width">0.6</CssParameter></Stroke>
            </Mark><Size>5</Size></Graphic>
          </PointSymbolizer>
        </Rule>
        <Rule>
          <Name>junction_mid</Name>
          <Title>Junction, mid elevation (10 - 50 m)</Title>
          <ogc:Filter>
            <ogc:PropertyIsBetween>
              <ogc:PropertyName>elev</ogc:PropertyName>
              <ogc:LowerBoundary><ogc:Literal>10</ogc:Literal></ogc:LowerBoundary>
              <ogc:UpperBoundary><ogc:Literal>50</ogc:Literal></ogc:UpperBoundary>
            </ogc:PropertyIsBetween>
          </ogc:Filter>
          <PointSymbolizer>
            <Graphic><Mark><WellKnownName>circle</WellKnownName>
              <Fill><CssParameter name="fill">#0891B2</CssParameter><CssParameter name="fill-opacity">0.9</CssParameter></Fill>
              <Stroke><CssParameter name="stroke">#164E63</CssParameter><CssParameter name="stroke-width">0.6</CssParameter></Stroke>
            </Mark><Size>5</Size></Graphic>
          </PointSymbolizer>
        </Rule>
        <Rule>
          <Name>junction_high</Name>
          <Title>Junction, high elevation (&gt;= 50 m)</Title>
          <ogc:Filter>
            <ogc:PropertyIsGreaterThanOrEqualTo>
              <ogc:PropertyName>elev</ogc:PropertyName><ogc:Literal>50</ogc:Literal>
            </ogc:PropertyIsGreaterThanOrEqualTo>
          </ogc:Filter>
          <PointSymbolizer>
            <Graphic><Mark><WellKnownName>circle</WellKnownName>
              <Fill><CssParameter name="fill">#16A34A</CssParameter><CssParameter name="fill-opacity">0.9</CssParameter></Fill>
              <Stroke><CssParameter name="stroke">#14532D</CssParameter><CssParameter name="stroke-width">0.6</CssParameter></Stroke>
            </Mark><Size>5</Size></Graphic>
          </PointSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
