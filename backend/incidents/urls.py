from django.urls import path

from . import views

app_name = "signalements"

urlpatterns = [
    # GET  : liste des signalements actifs (public).
    # POST : création d'un signalement (authentifié).
    path("", views.signalements_view, name="list"),
    # GET    : détail d'un signalement (public).
    # DELETE : suppression de son propre signalement (authentifié, propriétaire).
    path("<int:pk>/", views.signalement_detail_view, name="detail"),
    # POST : confirmer un signalement (authentifié) — incrémente le compteur.
    path("<int:pk>/voter/", views.vote_signalement_view, name="vote"),
]
