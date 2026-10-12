<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.1.0"
  xmlns="http://www.opengis.net/sld"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.1.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <Name>HK_LULC_DynamicWorld</Name>
    <UserStyle>
      <Name>lulc_dynamicworld</Name>
      <Title>DynamicWorld LULC (Modern Palette)</Title>
      <Abstract>9-class DynamicWorld with modern flat-style palette</Abstract>
      <FeatureTypeStyle>
        <Rule>
          <RasterSymbolizer>
            <Opacity>1.0</Opacity>
            <ColorMap>
              <ColorMapEntry color="#419BDF" quantity="0" opacity="0" label="0/water (masked)" />
              <ColorMapEntry color="#1F6F3B" quantity="1" label="1/trees" />
              <ColorMapEntry color="#7CC76A" quantity="2" label="2/grass" />
              <ColorMapEntry color="#91A0C0" quantity="3" label="3/flooded veg." />
              <ColorMapEntry color="#F2D545" quantity="4" label="4/crops" />
              <ColorMapEntry color="#C5B280" quantity="5" label="5/shrub" />
              <ColorMapEntry color="#D7301F" quantity="6" label="6/built" />
              <ColorMapEntry color="#BFB69C" quantity="7" label="7/bare" />
              <ColorMapEntry color="#FFFFFF" quantity="8" label="8/snow" />
              <ColorMapEntry color="#000000" quantity="255" opacity="0" label="nodata" />
            </ColorMap>
          </RasterSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>