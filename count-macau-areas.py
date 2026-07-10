"""
统计澳门统计区的数量
"""
import geopandas as gpd

# 读取 shapefile
shp_path = r"D:\Nat Cat Platform\Data\Shapefile\澳门统计区_WGS84坐标\澳门统计区（WGS84坐标系）.shp"
gdf = gpd.read_file(shp_path)

# 统计数量
print(f"澳门统计区数量: {len(gdf)}")

# 查看前几条数据
print("\n前5条数据:")
print(gdf.head())

# 查看所有列名
print("\n列名:")
print(gdf.columns.tolist())
