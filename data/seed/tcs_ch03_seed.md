## SEED — ORDRE DANS ℝ (contenu synthétique)

## Objectifs

- Comparer des réels et utiliser l'ordre avec les opérations.
- Utiliser intervalles, encadrements et valeur absolue.
- Déterminer une valeur approchée.

## LE COURS

## 1 Ordre et opérations

**DÉFINITION**
Pour deux réels $a$ et $b$, on écrit $a \leq b$ lorsque $b-a \geq 0$. Comparer $a$ et $b$ revient donc à étudier le signe de $b-a$.

**Propriété**
Pour tous réels $a$, $b$, $c$ :
- $a \leq b$ équivaut à $a+c \leq b+c$ ;
- si $c>0$, $a \leq b$ équivaut à $a c \leq b c$ ;
- si $c<0$, $a \leq b$ équivaut à $a c \geq b c$ (le sens change) ;
- si $a$ et $b$ sont non nuls et de même signe, $a \leq b$ équivaut à $\frac{1}{a} \geq \frac{1}{b}$ ;
- si $a \geq 0$ et $b \geq 0$, $a \leq b$ équivaut à $a^{2} \leq b^{2}$ et à $\sqrt{a} \leq \sqrt{b}$.

**Exemple**: $2 \leq 5$, donc $-3 \times 2 \geq -3 \times 5$, c'est-à-dire $-6 \geq -15$.

## 2 Intervalles

**DÉFINITION**
Pour $a<b$, l'intervalle $[a ; b]$ est l'ensemble des réels $x$ tels que $a \leq x \leq b$. On définit de même $]a ; b[$, $[a ; b[$, $]a ; b]$, ainsi que les intervalles non bornés $[a ;+\infty[$ et $]-\infty ; b]$.

**Remarque**
$x \in I \cap J$ signifie $x \in I$ et $x \in J$ ; $x \in I \cup J$ signifie $x \in I$ ou $x \in J$.

**Exemple**: $[-1 ; 4] \cap[2 ; 7]=[2 ; 4]$.

## 3 Encadrement

**DÉFINITION**
Encadrer un réel $x$, c'est trouver deux réels $a$ et $b$ tels que $a \leq x \leq b$. Le nombre $b-a$ est l'amplitude de l'encadrement.

**Propriété**
Si $a \leq x \leq b$ et $c \leq y \leq d$, alors $a+c \leq x+y \leq b+d$. Pour une différence, on encadre d'abord $-y$ : $-d \leq-y \leq-c$.

**Exemple**: si $1 \leq x \leq 2$ et $3 \leq y \leq 5$, alors $4 \leq x+y \leq 7$ et $-4 \leq x-y \leq-1$.

## 4 Valeur absolue

**DÉFINITION**
La valeur absolue d'un réel $x$, notée $|x|$, est la distance entre $0$ et $x$ sur la droite numérique : $|x|=x$ si $x \geq 0$ et $|x|=-x$ si $x \leq 0$.

**Propriété**
Pour tous réels $x$ et $y$ : $|x y|=|x||y|$, $\sqrt{x^{2}}=|x|$ et $|x+y| \leq|x|+|y|$.

**Exemple**: $|2-\sqrt{7}|=\sqrt{7}-2$ car $\sqrt{7}>2$.

## 5 Distance, centre et rayon

**Propriété**
La distance entre deux réels $x$ et $y$ est $|x-y|$. Pour $r>0$, $|x-c| \leq r$ équivaut à $x \in[c-r ; c+r]$ : c'est l'intervalle de centre $c$ et de rayon $r$.

**Exemple**: l'intervalle $[1 ; 9]$ a pour centre $\frac{1+9}{2}=5$ et pour rayon $\frac{9-1}{2}=4$.

## 6 Valeurs approchées

**DÉFINITION**
Si $a \leq x \leq a+r$ avec $r>0$, on dit que $a$ est une valeur approchée de $x$ par défaut à $r$ près, et $a+r$ une valeur approchée par excès à $r$ près. La partie entière $E(x)$ est l'unique entier relatif $p$ tel que $p \leq x<p+1$.

**Exemple**: $1,73 \leq \sqrt{3} \leq 1,74$, donc $1,73$ est une valeur approchée par défaut de $\sqrt{3}$ à $10^{-2}$ près, et $E(\sqrt{3})=1$.

## EXERCICES

Exercice 1 : Comparer $\sqrt{5}+1$ et $3$.

Exercice 2 : Écrire sous forme d'intervalle l'ensemble des réels $x$ tels que $|x+2| \leq 3$.

Exercice 3 : Sachant que $2 \leq x \leq 3$, encadrer $\frac{1}{x}$.

Exercice 4 : Donner $E(-2,4)$.
