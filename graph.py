import matplotlib.pyplot as plt
import japanize_matplotlib
from bs4 import BeautifulSoup

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

# 機種情報を削除し、日毎収支をまとめる
group_list = []
for group in day_list:
    pays = 0
    paybacks = 0
    for content in group:
        if("まで" in content):
            group_list.append([12, 14, -150])
            break
        
        if(is_date(content)):
            month, day = map(int, content.split("/"))
            temp_list = [month, day]
        else:
            if("k" in content):
                content = content.replace("k", "")
                pay, payback = map(float, content.split("/"))
                pays += pay
                paybacks += payback
        if(content == "end"):
            temp_list.append(paybacks - pays)
            group_list.append(temp_list)

# 日付と日毎収支をグラフにする
# 2023/12が最初で、2024/1, 2024/2, ...の順になるように順位付けを変更する
month_order = dict(zip(range(1, 13), [i%12 + 1 for i in range(1, 13)]))
group_list.sort(key=lambda x:(month_order[x[0]], x[1]))
group_list.pop(0)
days = ["12/14"]
sums = [-150]
for group in group_list:
    days.append(str(group[0]) + "/" + str(group[1]))
    sums.append(sums[-1] + group[2])

fig = plt.figure(figsize=[14, 8])
ax = fig.add_subplot(1, 1, 1)
ax.plot(days, sums)
ax.set_xticks([day for day in days[::int(0.08*len(days))]])
ax.set_title("合計収支の推移")
fig.savefig("source/move_money.png")
plt.tight_layout()
plt.show()
print("source/move_money.pngにグラフを保存しました")