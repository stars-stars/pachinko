import pandas as pd

datapath = 'data/day_datas.csv'
outpath = 'data/machine_name_list.txt'
df = pd.read_csv(datapath)
unique_name = df['machine_name'].unique().tolist()

with open(outpath, 'w', encoding='utf-8') as f:
    for name in unique_name:
        f.write(f"{name}\n")