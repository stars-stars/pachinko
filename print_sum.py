from bs4 import BeautifulSoup

# 現在の収支を調べる
soup = BeautifulSoup(open("days.html", encoding="utf-8"), "html.parser")
td_list = soup.find_all("td")
pays = []
returns = []
for element in td_list:
    if("k" in element.text):
        if("合計" in element.text):
            front = "150k"
            back = "0"
        else:
            front, back = element.text.split("/")
        pays.append(front)
        returns.append(back)

pays = [float(pay.replace("k", "")) for pay in pays]
returns = [float(temp.replace("k", "")) for temp in returns]

# 今までの収支を調べる
soup = BeautifulSoup(open("sum.html", encoding="utf-8"), "html.parser")
past = soup.find("h1")
past = past.text
print(past)
print(f"総合収支: {sum(returns) - sum(pays)}k")