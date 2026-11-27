## SEED — ENSEMBLE ℕ ET ARITHMÉTIQUE (contenu synthétique)

## Objectifs

- Connaître ℕ et ℕ*.
- Déterminer diviseurs et multiples, reconnaître la parité.
- Utiliser les critères de divisibilité et les nombres premiers.
- Calculer un PGCD et un PPCM.

## LE COURS

## 1 L'ensemble des entiers naturels

**DÉFINITION**
L'ensemble des entiers naturels est noté $\mathbb{N}$ : $\mathbb{N}=\{0 ; 1 ; 2 ; 3 ; \ldots\}$.
L'ensemble des entiers naturels non nuls est noté $\mathbb{N}^{*}$ : c'est $\mathbb{N}$ privé de $0$.

**Exemple**: $7 \in \mathbb{N}^{*}$, mais $0 \notin \mathbb{N}^{*}$.

## 2 Diviseurs et multiples

**DÉFINITION**
Soit $a$ et $b$ deux entiers naturels avec $b \neq 0$. On dit que $b$ divise $a$ s'il existe un entier naturel $k$ tel que $a=b k$. On dit alors que $a$ est un multiple de $b$.

**Exemple**: $36=4 \times 9$, donc $4$ divise $36$ et $36$ est un multiple de $9$.

**Remarque**
Tout entier naturel est un multiple de $1$, et $0$ est un multiple de chaque entier naturel non nul.

## 3 Parité

**DÉFINITION**
Un entier naturel $n$ est pair s'il s'écrit $n=2 k$ avec $k \in \mathbb{N}$ ; il est impair s'il s'écrit $n=2 k+1$ avec $k \in \mathbb{N}$.

**Exemple**: $58=2 \times 29$ est pair ; $41=2 \times 20+1$ est impair.

## 4 Critères de divisibilité

**Propriété**
Un entier naturel est divisible :
- par $2$ si son chiffre des unités est $0$, $2$, $4$, $6$ ou $8$ ;
- par $3$ lorsque l'addition de tous ses chiffres donne un multiple de $3$ ;
- par $4$ si le nombre formé par ses deux derniers chiffres est un multiple de $4$ ;
- par $5$ si son chiffre des unités est $0$ ou $5$ ;
- par $9$ lorsque l'addition de tous ses chiffres donne un multiple de $9$.

**Exemple**: pour $2\,376$, la somme des chiffres vaut $18$ : le nombre est divisible par $3$ et par $9$ ; ses deux derniers chiffres forment $76=4 \times 19$, il est donc divisible par $4$.

## 5 Nombres premiers

**DÉFINITION**
Un entier naturel est premier s'il possède exactement deux diviseurs : $1$ et lui-même.

**Remarque**
$0$ et $1$ ne sont pas premiers. Le seul nombre premier pair est $2$.

## 6 Décomposition en facteurs premiers

**Propriété**
Tout entier naturel supérieur ou égal à $2$ s'écrit comme un produit de nombres premiers.

**Exemple**: $252=2^{2} \times 3^{2} \times 7$.

## 7 PGCD et PPCM

**DÉFINITION**
Pour deux entiers naturels non nuls $a$ et $b$, $\operatorname{PGCD}(a ; b)$ est le plus grand de leurs diviseurs communs et $\operatorname{PPCM}(a ; b)$ le plus petit de leurs multiples communs non nuls. Si $\operatorname{PGCD}(a ; b)=1$, on dit que $a$ et $b$ sont premiers entre eux.

**Propriété**
Avec les décompositions en facteurs premiers, le PGCD est le produit des facteurs communs pris avec le plus petit exposant, et le PPCM le produit de tous les facteurs pris avec le plus grand exposant.

**Exemple**: $60=2^{2} \times 3 \times 5$ et $72=2^{3} \times 3^{2}$, donc $\operatorname{PGCD}(60 ; 72)=2^{2} \times 3=12$ et $\operatorname{PPCM}(60 ; 72)=2^{3} \times 3^{2} \times 5=360$.

## 8 Divisions successives

**Propriété**
Pour calculer $\operatorname{PGCD}(a ; b)$ avec $a>b$, on effectue des divisions euclidiennes successives : on divise $a$ par $b$, puis $b$ par le reste, et ainsi de suite. Le dernier reste non nul est le PGCD.

**Exemple**: $98=56 \times 1+42$ ; $56=42 \times 1+14$ ; $42=14 \times 3+0$. Donc $\operatorname{PGCD}(98 ; 56)=14$.

## EXERCICES

Exercice 1 : Donner tous les diviseurs de $45$.

Exercice 2 : Le nombre $5\,184$ est-il divisible par $4$ ? par $9$ ?

Exercice 3 : Décomposer $490$ en produit de facteurs premiers.

Exercice 4 : Calculer $\operatorname{PGCD}(84 ; 120)$ par divisions successives.
