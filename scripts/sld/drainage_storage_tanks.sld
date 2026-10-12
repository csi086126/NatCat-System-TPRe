<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0"
  xmlns="http://www.opengis.net/sld"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <Name>HK Storage Tank</Name>
    <UserStyle>
      <Name>drainage_storage_tanks</Name>
      <Title>HK Stormwater Storage Tank</Title>
      <Abstract>Stormwater detention / storage facility (e.g. Happy Valley underground tank)</Abstract>
      <FeatureTypeStyle>
        <Rule>
          <Name>storage_tank</Name>
          <Title>Storage Tank</Title>
          <PolygonSymbolizer>
            <Fill>
              <CssParameter name="fill">#3B82F6</CssParameter>
              <CssParameter name="fill-opacity">0.55</CssParameter>
            </Fill>
            <Stroke>
              <CssParameter name="stroke">#1E3A8A</CssParameter>
              <CssParameter name="stroke-width">2.5</CssParameter>
              <CssParameter name="stroke-dasharray">6 3</CssParameter>
            </Stroke>
          </PolygonSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>