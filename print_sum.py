from bs4 import BeautifulSoup
import re
import datetime


# 現在の収支を調べる
soup = BeautifulSoup(open("days.html", encoding="utf-8"), "html.parser")
td_list = soup.find_all("td")
pays = []
payback = []
for element in td_list:
    if("k" in element.text):
        if("合計" in element.text):
            front = "150k"
            back = "0"
        else:
            front, back = element.text.split("/")
        pays.append(front)
        payback.append(back)

# 丸め誤差対策として10倍する
pays = [float(pay.replace("k", ""))*10 for pay in pays]
payback = [float(temp.replace("k", ""))*10 for temp in payback]

# 今までの収支を調べる
soup = BeautifulSoup(open("sum.html", encoding="utf-8"), "html.parser")
past = soup.find("h1")
past = past.text.replace("!", "").replace("k", "")
pastday = soup.find("h3")
pastday = re.search(r"\d+/\d+/\d+", pastday.text)
today = str(datetime.date.today())
today = today.replace("-", "/")
print(f"{pastday.group()}までの総合収支: {past}k")
print(f"{today}現在の総合収支: {(sum(payback) - sum(pays))/10}k")

# 文字列から日付型への変換
pastday = datetime.datetime.strptime(pastday.group(), "%Y/%m/%d")
today = datetime.datetime.strptime(today, "%Y/%m/%d")

#日付の差分を計算
diff_day = re.search(r"\d+ day", str(today - pastday)).group()
diff_day = str(diff_day).replace(" day", "").replace("s", "")
diff_money = sum(payback)-sum(pays) - float(past)*10 # 丸め誤差対策として10倍する
diff_money = "+" + str(diff_money/10) if diff_money > 0 else str(diff_money)
print(f"{diff_day}日間で収支{diff_money}k")