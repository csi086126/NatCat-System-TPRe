<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0"
  xmlns="http://www.opengis.net/sld"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <Name>HK_DEM_5m</Name>
    <UserStyle>
      <Name>dem_terrain</Name>
      <Title>Hong Kong DEM (Viridis-Inspired Elevation)</Title>
      <Abstract>Modern elevation color ramp (Viridis-inspired) for HK 5m DEM, range 0-950m</Abstract>
      <FeatureTypeStyle>
        <Rule>
          <RasterSymbolizer>
            <Opacity>1.0</Opacity>
            <ColorMap type="ramp">
              <ColorMapEntry color="#DDEBC0" quantity="0"   label="0m" />
              <ColorMapEntry color="#C5DDA8" quantity="100" label="100m" />
              <ColorMapEntry color="#A9CC8A" quantity="200" label="200m" />
              <ColorMapEntry color="#C8D2A8" quantity="300" label="300m" />
              <ColorMapEntry color="#D2C8A0" quantity="400" label="400m" />
              <ColorMapEntry color="#C7B98A" quantity="500" label="500m" />
              <ColorMapEntry color="#B5A375" quantity="600" label="600m" />
              <ColorMapEntry color="#A88A5A" quantity="700" label="700m" />
              <ColorMapEntry color="#C5B796" quantity="800" label="800m" />
              <ColorMapEntry color="#F5F2E2" quantity="950" label="950m+" />
            </ColorMap>
          </RasterSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>