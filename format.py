from bs4 import BeautifulSoup
import re
import datetime


# 現在の収支を調べる
soup = BeautifulSoup(open("diary.html", encoding="utf-8"), "html.parser")
div_list = soup.find_all("div")
for div in div_list:
    print(div)