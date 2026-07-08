from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Business',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=150)),
                ('business_type', models.CharField(
                    choices=[('RESTAURANT', 'Restaurant'), ('BAR', 'Bar'), ('CAFE', 'Café')],
                    default='RESTAURANT', max_length=20,
                )),
                ('location', models.CharField(blank=True, max_length=200)),
                ('phone', models.CharField(blank=True, max_length=20)),
                ('email', models.EmailField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Business',
                'verbose_name_plural': 'Businesses',
                'ordering': ['name'],
            },
        ),
        migrations.AddField(
            model_name='customuser',
            name='business',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='users',
                to='accounts.business',
            ),
        ),
    ]
