from bs4 import BeautifulSoup
import pandas as pd

def is_date(text):
    flag = True
    if("/" not in text):
        flag = False
    if("k" in text):
        flag = False
    return flag

# 現在の収支を調べる
soup = BeautifulSoup(open("days.html", encoding="utf-8"), "html.parser")
td_list = soup.find_all("td")
td_list = [content.text for content in td_list]

# 日付ごとに2次元リストにまとめる
day_list = []
temp_list = []
for i, content in enumerate(td_list):
    if(i == 0):
        temp_list.append(content)
        continue
    if(is_date(content)):
        temp_list.append("end")
        day_list.append(temp_list)
        temp_list = []
    temp_list.append(content)
temp_list.append("end")
day_list.append(temp_list)

# 日付情報を削除し、機種毎収支をDataFrameで保存する
day_list = [day[1:-1] for day in day_list]
group_list = []
for day in day_list:
    for i, value in enumerate(day):
        if(i%2 == 0):
            name = value
        else:
            pay, payback = value.replace("k", "").split("/")
            group_list.append([name, float(pay), float(payback)])

df = pd.DataFrame(data=group_list, columns=["機種", "投資額", "回収額"])
print(df.groupby("機種").sum())