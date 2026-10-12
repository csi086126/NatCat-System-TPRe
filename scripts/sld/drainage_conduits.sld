<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0"
  xmlns="http://www.opengis.net/sld"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <Name>HK Drainage Conduits</Name>
    <UserStyle>
      <Name>drainage_conduits</Name>
      <Title>HK Drainage Network Conduits</Title>
      <Abstract>Pipes colored by length category (shorter = thinner, longer = thicker). All roughness 0.01 (uniform material).</Abstract>
      <FeatureTypeStyle>
        <!-- Very long pipes (>= 500 m) - trunk sewers -->
        <Rule>
          <Name>trunk</Name>
          <Title>Trunk Sewer (length &gt;= 500 m)</Title>
          <ogc:Filter>
            <ogc:PropertyIsGreaterThanOrEqualTo>
              <ogc:PropertyName>length</ogc:PropertyName>
              <ogc:Literal>500</ogc:Literal>
            </ogc:PropertyIsGreaterThanOrEqualTo>
          </ogc:Filter>
          <LineSymbolizer>
            <Stroke>
              <CssParameter name="stroke">#1D4ED8</CssParameter>
              <CssParameter name="stroke-width">2.8</CssParameter>
              <CssParameter name="stroke-linecap">round</CssParameter>
              <CssParameter name="stroke-linejoin">round</CssParameter>
            </Stroke>
          </LineSymbolizer>
        </Rule>

        <!-- Long pipes (100-500 m) -->
        <Rule>
          <Name>long</Name>
          <Title>Main Pipe (100 - 500 m)</Title>
          <ogc:Filter>
            <ogc:PropertyIsBetween>
              <ogc:PropertyName>length</ogc:PropertyName>
              <ogc:LowerBoundary><ogc:Literal>100</ogc:Literal></ogc:LowerBoundary>
              <ogc:UpperBoundary><ogc:Literal>500</ogc:Literal></ogc:UpperBoundary>
            </ogc:PropertyIsBetween>
          </ogc:Filter>
          <LineSymbolizer>
            <Stroke>
              <CssParameter name="stroke">#2563EB</CssParameter>
              <CssParameter name="stroke-width">2.0</CssParameter>
              <CssParameter name="stroke-linecap">round</CssParameter>
              <CssParameter name="stroke-linejoin">round</CssParameter>
            </Stroke>
          </LineSymbolizer>
        </Rule>

        <!-- Medium pipes (20-100 m) -->
        <Rule>
          <Name>medium</Name>
          <Title>Branch Pipe (20 - 100 m)</Title>
          <ogc:Filter>
            <ogc:PropertyIsBetween>
              <ogc:PropertyName>length</ogc:PropertyName>
              <ogc:LowerBoundary><ogc:Literal>20</ogc:Literal></ogc:LowerBoundary>
              <ogc:UpperBoundary><ogc:Literal>100</ogc:Literal></ogc:UpperBoundary>
            </ogc:PropertyIsBetween>
          </ogc:Filter>
          <LineSymbolizer>
            <Stroke>
              <CssParameter name="stroke">#3B82F6</CssParameter>
              <CssParameter name="stroke-width">1.4</CssParameter>
              <CssParameter name="stroke-linecap">round</CssParameter>
              <CssParameter name="stroke-linejoin">round</CssParameter>
            </Stroke>
          </LineSymbolizer>
        </Rule>

        <!-- Short pipes (< 20 m) -->
        <Rule>
          <Name>short</Name>
          <Title>Local Pipe (&lt; 20 m)</Title>
          <ogc:Filter>
            <ogc:PropertyIsLessThan>
              <ogc:PropertyName>length</ogc:PropertyName>
              <ogc:Literal>20</ogc:Literal>
            </ogc:PropertyIsLessThan>
          </ogc:Filter>
          <LineSymbolizer>
            <Stroke>
              <CssParameter name="stroke">#60A5FA</CssParameter>
              <CssParameter name="stroke-width">0.9</CssParameter>
              <CssParameter name="stroke-linecap">round</CssParameter>
              <CssParameter name="stroke-linejoin">round</CssParameter>
            </Stroke>
          </LineSymbolizer>
        </Rule>

      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>