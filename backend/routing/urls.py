from django.urls import path

from . import views

app_name = 'routing'

urlpatterns = [
    path('geocode/', views.geocode_view, name='geocode'),
    path('geocode/inverse/', views.reverse_geocode_view, name='reverse-geocode'),
    path('directions/', views.directions_view, name='directions'),
    path('profiles/', views.profiles_view, name='profiles'),
]
