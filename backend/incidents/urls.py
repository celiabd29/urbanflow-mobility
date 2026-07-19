from django.urls import path

from . import views

app_name = "incidents"

urlpatterns = [
    path("", views.list_incidents_view, name="list"),
    path("signaler/", views.create_incident_view, name="create"),
]
