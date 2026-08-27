from django.urls import path

from . import views

app_name = "transport"

urlpatterns = [
    path("disponibilites/", views.availability_view, name="availability"),
    path("perturbations/", views.disruptions_view, name="disruptions"),
    path("meteo/", views.weather_view, name="weather"),
]
