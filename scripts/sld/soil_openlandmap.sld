<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.1.0"
  xmlns="http://www.opengis.net/sld"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.1.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <Name>HK_SOIL_OpenLandMap</Name>
    <UserStyle>
      <Name>soil_openlandmap</Name>
      <Title>OpenLandMap Soil (YlOrBr Gradient)</Title>
      <Abstract>OpenLandMap soil mode 0-9 with ColorBrewer YlOrBr gradient</Abstract>
      <FeatureTypeStyle>
        <Rule>
          <RasterSymbolizer>
            <Opacity>1.0</Opacity>
            <ColorMap>
              <ColorMapEntry color="#FFF8E7" quantity="0" opacity="0" label="0 (masked)" />
              <ColorMapEntry color="#FFFFE5" quantity="1" label="1" />
              <ColorMapEntry color="#FFF7BC" quantity="2" label="2" />
              <ColorMapEntry color="#FEE391" quantity="3" label="3" />
              <ColorMapEntry color="#FEC44F" quantity="4" label="4" />
              <ColorMapEntry color="#FE9929" quantity="5" label="5" />
              <ColorMapEntry color="#EC7014" quantity="6" label="6" />
              <ColorMapEntry color="#CC4C02" quantity="7" label="7" />
              <ColorMapEntry color="#993404" quantity="8" label="8" />
              <ColorMapEntry color="#662506" quantity="9" label="9" />
              <ColorMapEntry color="#000000" quantity="255" opacity="0" label="nodata" />
            </ColorMap>
          </RasterSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>