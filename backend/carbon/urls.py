from django.urls import path

from . import views

app_name = "carbon"

urlpatterns = [
    path("trajets/", views.create_trajet_view, name="create-trajet"),
    path("resume/", views.monthly_summary_view, name="monthly-summary"),
]
