#!/usr/bin/env python3
"""Create eight unique football-themed system banners, no athlete-card edits."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from random import Random
import math

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'assets/ui/v57'
OUT.mkdir(parents=True,exist_ok=True)
W,H=1000,250
FONT=next(p for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf',
                        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'] if Path(p).exists())
REG='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
SCENES={
 'perfil':('PERFIL DO TREINADOR','SUA JORNADA NO FUTEBOL',(89,217,246)),
 'mercado':('MERCADO','NEGOCIE. REFORCE. CONQUISTE.',(245,199,107)),
 'pacotes':('CENTRAL DE PACOTES','ABRA SEU PROXIMO CAPITULO',(77,234,227)),
 'time':('SEU ELENCO','O FUTURO ESTA NA SUA TATICA',(96,240,210)),
 'partida':('ARENA FUTSTANCY','A PARTIDA COMECA AQUI',(205,125,251)),
 'ranking':('RANKING GLOBAL','O TOPO E PARA OS MELHORES',(252,202,114)),
 'daily':('RECOMPENSAS','CADA JOGADA VALE A PENA',(246,200,114)),
 'inicio':('BEM-VINDO AO CLUBE','O SEU LEGADO COMECA AGORA',(90,201,251)),
}
def mix(a,b,t):return tuple(int(a[i]*(1-t)+b[i]*t) for i in range(3))
def glow(im,box,color):
 layer=Image.new('RGBA',im.size);d=ImageDraw.Draw(layer)
 d.ellipse(box,fill=(*color,115))
 return Image.alpha_composite(im,layer.filter(ImageFilter.GaussianBlur(110)))
def poly(d,pts,fill,outline=None,width=1):
 d.polygon(pts,fill=fill)
 if outline:d.line(pts+[pts[0]],fill=outline,width=width,joint='curve')
def scene(im,key,acc):
 d=ImageDraw.Draw(im,'RGBA');rnd=Random('futstancy-banner:'+key)
 d.arc((385,-300,1180,490),0,180,fill=(91,144,180,58),width=11)
 d.ellipse((520,80,1170,370),outline=(79,135,163,44),width=12)
 for i in range(80):
  x=rnd.randrange(470,1000);y=rnd.randrange(16,240)
  d.ellipse((x,y,x+1.5,y+1.5),fill=(*acc,rnd.randrange(30,110)))
 if key in ('perfil','inicio','partida','ranking','time'):
  poly(d,[(440,230),(780,108),(1005,135),(1005,255)],(3,35,44,220))
  for k in range(12):
   x=560+35*k;d.line((x,160,x+50,230),fill=(*acc,28),width=2)
  for j in range(11):
   x=560+j*42;d.ellipse((x,58,x+9,67),fill=(190,241,255,100))
 if key=='perfil':
  d.ellipse((747,53,835,140),fill=(7,13,28,255),outline=(*acc,100),width=3)
  poly(d,[(735,131),(855,130),(909,270),(672,270)],(11,20,35,255),(*acc,80),3)
  d.line((795,139,790,255),fill=(*acc,50),width=4)
 if key=='mercado':
  poly(d,[(639,114),(955,104),(907,240),(606,235)],(29,38,48,255),(*acc,160),3)
  poly(d,[(676,124),(921,121),(880,216),(649,213)],(204,214,222,245))
  for i in range(5):d.line((695,146+i*11,862-i*5,143+i*10),fill=(80,103,121,150),width=2)
  d.line((832,92,913,193),fill=(*acc,235),width=7)
  d.ellipse((754,65,840,144),fill=(17,38,48,255),outline=(*acc,220),width=5)
  d.arc((767,78,831,131),0,360,fill=(*acc,255),width=4)
 if key=='pacotes':
  poly(d,[(724,40),(878,48),(896,211),(696,207)],(8,26,36,255),(*acc,235),7)
  for offset in range(5,64,11):d.line((715+offset,45,701+offset,207),fill=(*acc,90),width=4)
  d.ellipse((741,83,845,188),outline=(*acc,240),width=4)
  d.text((767,105),'F',font=ImageFont.truetype(FONT,54),fill=(236,245,255,250))
  for i in range(16):
   a=i*math.pi/8;x=800+150*math.cos(a);y=125+111*math.sin(a)
   d.line((x-4,y,x+4,y),fill=(*acc,170),width=2)
 if key=='time':
  poly(d,[(656,54),(918,80),(962,220),(613,227)],(6,61,55,210),(*acc,200),3)
  for k in range(1,5):
   y=70+k*29;d.line((637,y,950,y+6),fill=(*acc,90),width=2)
  d.ellipse((746,113,851,171),outline=(*acc,180),width=3)
  spots=[(789,77),(714,123),(789,121),(872,123),(690,179),(757,173),
         (834,173),(903,181),(764,206),(832,206),(804,222)]
  for x,y in spots:d.ellipse((x-8,y-8,x+8,y+8),fill=(*acc,225),
                              outline=(230,250,255,200),width=2)
 if key=='partida':
  d.line((792,50,792,239),fill=(240,246,255,160),width=3)
  for x,c in [(673,(33,198,249)),(858,(189,74,241))]:
   d.ellipse((x-51,76,x+51,178),fill=(*c,42),outline=(*c,240),width=6)
   d.text((x-20,96),'F',font=ImageFont.truetype(FONT,54),fill=(*c,255))
  d.polygon([(792,100),(765,156),(802,152),(769,205)],fill=(255,239,250,230))
 if key=='ranking':
  d.ellipse((722,74,904,162),outline=(*acc,210),width=11)
  poly(d,[(741,64),(881,64),(852,147),(772,147)],(125,74,17,255),(*acc,255),6)
  d.line((811,143,811,199),fill=(*acc,255),width=12)
  d.rounded_rectangle((760,193,862,209),radius=4,fill=(*acc,255))
  d.rounded_rectangle((727,209,894,231),radius=4,fill=(105,66,30,255),
                      outline=(*acc,240),width=3)
  for j in range(8):
   x=680+j*27;d.ellipse((x,50,x+4,54),fill=(255,246,188,190))
 if key=='daily':
  for x,dy,n in [(667,188,3),(755,166,4),(843,206,2)]:
   for i in range(n):
    y=dy-i*24
    d.ellipse((x,y,x+103,y+46),fill=(118,72,19,255),outline=(*acc,255),width=4)
    d.line((x+8,y+20,x+96,y+20),fill=(*acc,125),width=2)
  d.ellipse((792,75,901,184),fill=(135,87,33,255),outline=(*acc,240),width=8)
  d.ellipse((806,90,887,171),outline=(255,237,177,220),width=3)
  d.text((833,108),'F',font=ImageFont.truetype(FONT,43),fill=(255,224,145,240))
 if key=='inicio':
  poly(d,[(598,220),(647,104),(708,86),(844,86),(903,105),(967,225)],
       (10,43,58,255),(*acc,200),5)
  for x in range(670,895,37):d.line((x,117,x,204),fill=(*acc,60),width=3)
  poly(d,[(747,60),(815,43),(884,60),(878,139),(813,181),(748,138)],
       (7,34,49,255),(*acc,255),5)
  d.text((796,80),'F',font=ImageFont.truetype(FONT,59),fill=(247,249,255,245))
  for k in range(6):d.line((620,233+k*3,959,233+k*3),
                           fill=(*acc,max(0,60-k*9)),width=2)
def render(key,title,tagline,acc):
 im=Image.new('RGBA',(W,H),(5,13,29,255));d=ImageDraw.Draw(im)
 for y in range(H):d.line((0,y,W,y),fill=(*mix((8,15,32),(9,42,57),y/H),255))
 im=glow(im,(525,-135,1080,355),acc)
 scene(im,key,acc)
 layer=Image.new('RGBA',(W,H));mask=ImageDraw.Draw(layer)
 for x in range(610):
  a=int(225*(1-x/610)**2)
  mask.line((x,0,x,H),fill=(2,10,23,a))
 im=Image.alpha_composite(im,layer);d=ImageDraw.Draw(im)
 d.rounded_rectangle((23,23,29,H-22),radius=2,fill=(*acc,255))
 d.text((50,28),'FUTSTANCY  /  '+key.upper(),
        font=ImageFont.truetype(REG,20),fill=(*acc,255))
 size=46
 while size>24 and d.textbbox((0,0),title,
           font=ImageFont.truetype(FONT,size))[2]>705:size-=2
 d.text((49,90),title,font=ImageFont.truetype(FONT,size),fill=(247,251,255,255))
 d.text((52,171),tagline,font=ImageFont.truetype(REG,20),fill=(185,215,224,255))
 d.line((51,226,165,226),fill=(*acc,255),width=4)
 im=im.convert('RGB').resize((800,200),Image.Resampling.LANCZOS)
 im.save(OUT/f'{key}.jpg','JPEG',quality=88,optimize=True,progressive=True)
 print('Banner:',key)
if __name__=='__main__':
 for key,(title,tagline,color) in SCENES.items():render(key,title,tagline,color)
