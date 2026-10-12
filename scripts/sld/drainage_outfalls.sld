<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0"
  xmlns="http://www.opengis.net/sld"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <Name>HK Drainage Outfalls</Name>
    <UserStyle>
      <Name>drainage_outfalls</Name>
      <Title>HK Drainage Outfalls (SWMM [OUTFALLS])</Title>
      <Abstract>Outfall nodes - where stormwater discharges to receiving waters. Red squares for visibility.</Abstract>
      <FeatureTypeStyle>
        <Rule>
          <Name>outfall</Name>
          <Title>Outfall</Title>
          <PointSymbolizer>
            <Graphic><Mark><WellKnownName>square</WellKnownName>
              <Fill><CssParameter name="fill">#DC2626</CssParameter><CssParameter name="fill-opacity">0.95</CssParameter></Fill>
              <Stroke><CssParameter name="stroke">#7F1D1D</CssParameter><CssParameter name="stroke-width">1.2</CssParameter></Stroke>
            </Mark><Size>10</Size></Graphic>
          </PointSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
