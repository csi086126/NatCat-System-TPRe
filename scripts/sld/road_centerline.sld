<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0"
 xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd"
 xmlns="http://www.opengis.net/sld"
 xmlns:ogc="http://www.opengis.net/ogc"
 xmlns:xlink="http://www.w3.org/1999/xlink"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <NamedLayer>
    <Name>Road CENTERLINE</Name>
    <UserStyle>
      <Title>HK Road Network (Strategic + Elevation)</Title>
      <Abstract>Strategic routes vs local roads, plus elevation layering (purple=underground, default=ground, orange=elevated)</Abstract>
      <FeatureTypeStyle>
        <!-- Underground: ELEVATION < 0 -->
        <Rule>
          <Name>underground</Name>
          <Title>Underground (ELEVATION &lt; 0)</Title>
          <ogc:Filter>
            <ogc:PropertyIsLessThan>
              <ogc:PropertyName>ELEVATION</ogc:PropertyName>
              <ogc:Literal>0</ogc:Literal>
            </ogc:PropertyIsLessThan>
          </ogc:Filter>
          <LineSymbolizer>
            <Stroke>
              <CssParameter name="stroke">#7B2D8E</CssParameter>
              <CssParameter name="stroke-width">1.5</CssParameter>
              <CssParameter name="stroke-dasharray">4 2</CssParameter>
            </Stroke>
          </LineSymbolizer>
        </Rule>

        <!-- Elevated: ELEVATION > 0 -->
        <Rule>
          <Name>elevated</Name>
          <Title>Elevated (ELEVATION &gt; 0)</Title>
          <ogc:Filter>
            <ogc:PropertyIsGreaterThan>
              <ogc:PropertyName>ELEVATION</ogc:PropertyName>
              <ogc:Literal>0</ogc:Literal>
            </ogc:PropertyIsGreaterThan>
          </ogc:Filter>
          <LineSymbolizer>
            <Stroke>
              <CssParameter name="stroke">#FF8C42</CssParameter>
              <CssParameter name="stroke-width">1.5</CssParameter>
            </Stroke>
          </LineSymbolizer>
        </Rule>

        <!-- Ground level: ELEVATION = 0, with strategic vs local sub-rules -->
        <Rule>
          <Name>strategic</Name>
          <Title>Strategic Route, Ground (ROUTE_NUM 1-10)</Title>
          <ogc:Filter>
            <ogc:And>
              <ogc:PropertyIsEqualTo>
                <ogc:PropertyName>ELEVATION</ogc:PropertyName>
                <ogc:Literal>0</ogc:Literal>
              </ogc:PropertyIsEqualTo>
              <ogc:PropertyIsBetween>
                <ogc:PropertyName>ROUTE_NUM</ogc:PropertyName>
                <ogc:LowerBoundary><ogc:Literal>1</ogc:Literal></ogc:LowerBoundary>
                <ogc:UpperBoundary><ogc:Literal>10</ogc:Literal></ogc:UpperBoundary>
              </ogc:PropertyIsBetween>
            </ogc:And>
          </ogc:Filter>
          <LineSymbolizer>
            <Stroke>
              <CssParameter name="stroke">#E63946</CssParameter>
              <CssParameter name="stroke-width">3.0</CssParameter>
            </Stroke>
          </LineSymbolizer>
        </Rule>
        <Rule>
          <Name>default</Name>
          <Title>Other Roads, Ground</Title>
          <LineSymbolizer>
            <Stroke>
              <CssParameter name="stroke">#457B9D</CssParameter>
              <CssParameter name="stroke-width">1.0</CssParameter>
            </Stroke>
          </LineSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>